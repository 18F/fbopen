##### **!!! WORK IN PROGRESS !!!** #####

#!/bin/bash

#### Security Enhanced Linux (SELinux setup) ####

# Install SELinux

yum install policycoreutils setroubleshoot
vi /etc/selinux/config

# Update SELinux config

vi /etc/selinux/config
SELINUX=permissive
SELINUXTYPE=targeted

# Reboot. Check for errors.

grep "SELinux is preventing" /var/log/messages

# If none:

vi /etc/selinux/config
SELINUX=enforcing
SELINUXTYPE=targeted

# Make sure Grub is not turning SELinux off

egrep -i 'selinux=0|enforcing=0' /boot/grub/grub.conf

# Quick check to make sure it's running

sestatus

# By default SELinux will not protect the nginx web server. However, you can install and compile protection as follows. Assumes SELinux is already installed and in enforcing mode:

yum -y install selinux-policy-targeted selinux-policy-devel

# Download targeted SELinux policies to harden the nginx webserver on Linux servers from the project home page

cd /opt
wget 'http://downloads.sourceforge.net/project/selinuxnginx/se-ngix_1_0_10.tar.gz?use_mirror=nchc'
tar -zxvf se-ngix_1_0_10.tar.gz
cd se-ngix_1_0_10/nginx
make
/usr/sbin/semodule -i nginx.pp

#### Restrictive Iptables Based Firewall ####

IPT="/sbin/iptables"
 
#### IPS ######

# Get server public ip 
SERVER_IP=$(ifconfig eth0 | grep 'inet addr:' | awk -F'inet addr:' '{ print $2}' | awk '{ print $1}')
LB1_IP="204.54.1.1"
LB2_IP="204.54.1.2"
 
# Do some smart logic so that we can use damm script on LB2 too
OTHER_LB=""
SERVER_IP=""
[[ "$SERVER_IP" == "$LB1_IP" ]] && OTHER_LB="$LB2_IP" || OTHER_LB="$LB1_IP"
[[ "$OTHER_LB" == "$LB2_IP" ]] && OPP_LB="$LB1_IP" || OPP_LB="$LB2_IP"
 
### IPs ###
PUB_SSH_ONLY="122.xx.yy.zz/29"
 
#### FILES #####
BLOCKED_IP_TDB=/root/.fw/blocked.ip.txt
SPOOFIP="127.0.0.0/8 192.168.0.0/16 172.16.0.0/12 10.0.0.0/8 169.254.0.0/16 0.0.0.0/8 240.0.0.0/4 255.255.255.255/32 168.254.0.0/16 224.0.0.0/4 240.0.0.0/5 248.0.0.0/5 192.0.2.0/24"
BADIPS=$( [[ -f ${BLOCKED_IP_TDB} ]] && egrep -v "^#|^$" ${BLOCKED_IP_TDB})
 
### Interfaces ###
PUB_IF="eth0"   # public interface
LO_IF="lo"      # loopback
VPN_IF="eth1"   # vpn / private net
 
### start firewall ###
echo "Setting LB1 $(hostname) Firewall..."

# DROP and close everything 
$IPT -P INPUT DROP
$IPT -P OUTPUT DROP
$IPT -P FORWARD DROP
 
# Unlimited lo access
$IPT -A INPUT -i ${LO_IF} -j ACCEPT
$IPT -A OUTPUT -o ${LO_IF} -j ACCEPT
 
# Unlimited vpn / pnet access
$IPT -A INPUT -i ${VPN_IF} -j ACCEPT
$IPT -A OUTPUT -o ${VPN_IF} -j ACCEPT
 
# Drop sync
$IPT -A INPUT -i ${PUB_IF} -p tcp ! --syn -m state --state NEW -j DROP
 
# Drop Fragments
$IPT -A INPUT -i ${PUB_IF} -f -j DROP
 
$IPT  -A INPUT -i ${PUB_IF} -p tcp --tcp-flags ALL FIN,URG,PSH -j DROP
$IPT  -A INPUT -i ${PUB_IF} -p tcp --tcp-flags ALL ALL -j DROP
 
# Drop NULL packets
$IPT  -A INPUT -i ${PUB_IF} -p tcp --tcp-flags ALL NONE -m limit --limit 5/m --limit-burst 7 -j LOG --log-prefix " NULL Packets "
$IPT  -A INPUT -i ${PUB_IF} -p tcp --tcp-flags ALL NONE -j DROP
 
$IPT  -A INPUT -i ${PUB_IF} -p tcp --tcp-flags SYN,RST SYN,RST -j DROP
 
# Drop XMAS
$IPT  -A INPUT -i ${PUB_IF} -p tcp --tcp-flags SYN,FIN SYN,FIN -m limit --limit 5/m --limit-burst 7 -j LOG --log-prefix " XMAS Packets "
$IPT  -A INPUT -i ${PUB_IF} -p tcp --tcp-flags SYN,FIN SYN,FIN -j DROP
 
# Drop FIN packet scans
$IPT  -A INPUT -i ${PUB_IF} -p tcp --tcp-flags FIN,ACK FIN -m limit --limit 5/m --limit-burst 7 -j LOG --log-prefix " Fin Packets Scan "
$IPT  -A INPUT -i ${PUB_IF} -p tcp --tcp-flags FIN,ACK FIN -j DROP
 
$IPT  -A INPUT -i ${PUB_IF} -p tcp --tcp-flags ALL SYN,RST,ACK,FIN,URG -j DROP
 
# Log and get rid of broadcast / multicast and invalid 
$IPT  -A INPUT -i ${PUB_IF} -m pkttype --pkt-type broadcast -j LOG --log-prefix " Broadcast "
$IPT  -A INPUT -i ${PUB_IF} -m pkttype --pkt-type broadcast -j DROP
 
$IPT  -A INPUT -i ${PUB_IF} -m pkttype --pkt-type multicast -j LOG --log-prefix " Multicast "
$IPT  -A INPUT -i ${PUB_IF} -m pkttype --pkt-type multicast -j DROP
 
$IPT  -A INPUT -i ${PUB_IF} -m state --state INVALID -j LOG --log-prefix " Invalid "
$IPT  -A INPUT -i ${PUB_IF} -m state --state INVALID -j DROP
 
# Log and block spoofed ips
$IPT -N spooflist
for ipblock in $SPOOFIP
do
         $IPT -A spooflist -i ${PUB_IF} -s $ipblock -j LOG --log-prefix " SPOOF List Block "
         $IPT -A spooflist -i ${PUB_IF} -s $ipblock -j DROP
done
$IPT -I INPUT -j spooflist
$IPT -I OUTPUT -j spooflist
$IPT -I FORWARD -j spooflist
 
# Allow ssh only from selected public ips
for ip in ${PUB_SSH_ONLY}
do
        $IPT -A INPUT -i ${PUB_IF} -s ${ip} -p tcp -d ${SERVER_IP} --destination-port 22 -j ACCEPT
        $IPT -A OUTPUT -o ${PUB_IF} -d ${ip} -p tcp -s ${SERVER_IP} --sport 22 -j ACCEPT
done
 
# allow incoming ICMP ping pong stuff
$IPT -A INPUT -i ${PUB_IF} -p icmp --icmp-type 8 -s 0/0 -m state --state NEW,ESTABLISHED,RELATED -m limit --limit 30/sec  -j ACCEPT
$IPT -A OUTPUT -o ${PUB_IF} -p icmp --icmp-type 0 -d 0/0 -m state --state ESTABLISHED,RELATED -j ACCEPT
 
# allow incoming HTTP port 80
$IPT -A INPUT -i ${PUB_IF} -p tcp -s 0/0 --sport 1024:65535 --dport 80 -m state --state NEW,ESTABLISHED -j ACCEPT
$IPT -A OUTPUT -o ${PUB_IF} -p tcp --sport 80 -d 0/0 --dport 1024:65535 -m state --state ESTABLISHED -j ACCEPT
 
 
# allow outgoing ntp 
$IPT -A OUTPUT -o ${PUB_IF} -p udp --dport 123 -m state --state NEW,ESTABLISHED -j ACCEPT
$IPT -A INPUT -i ${PUB_IF} -p udp --sport 123 -m state --state ESTABLISHED -j ACCEPT
 
# allow outgoing smtp
$IPT -A OUTPUT -o ${PUB_IF} -p tcp --dport 25 -m state --state NEW,ESTABLISHED -j ACCEPT
$IPT -A INPUT -i ${PUB_IF} -p tcp --sport 25 -m state --state ESTABLISHED -j ACCEPT
 
# drop and log everything else
$IPT -A INPUT -m limit --limit 5/m --limit-burst 7 -j LOG --log-prefix " DEFAULT DROP "
$IPT -A INPUT -j DROP
 
# Drop IPs that make > 15 connections in < 60 secs 

$IPT -A INPUT -p tcp --dport 80 -i eth0 -m state --state NEW -m recent --set
$IPT -A INPUT -p tcp --dport 80 -i eth0 -m state --state NEW -m recent --update --seconds 60  --hitcount 15 -j DROP service iptables save

exit 0

#### NGINX ####

### Nginx Build ###

# Since we are compiling nginx, we should not build modules we don't need to reduce the attack surface. ref: http://wiki.nginx.org/Modules 

./configure --without-http_empty_gif_module --without-http_geo_module --without-http_gzip_module --without-http_limit_conn_module --without-http_map_module --without-http_ssi_module --without-http_split_clients_module --without-http_scgi_module --without-http_rewrite_module --without-http_proxy_module --without-http_referer_module --without-http_userid_module

## Note to self: shoud split above and better categorize. Also make inquiry re: proxy and IP filtering using access module

### Nginx Configuration ###

# Edit nginx.conf:

vi /usr/local/nginx/conf/nginx.conf
 
## Size Limits & Buffer Overflows prevention ##

client_body_buffer_size  1K;
client_header_buffer_size 1k;
client_max_body_size 1k;
large_client_header_buffers 2 1k;

## Timeouts ##

client_body_timeout   10;
client_header_timeout 10;
keepalive_timeout     5 5;
send_timeout          10;

# Control maximum number of simultaneous connections for one session i.e.

limit_zone slimits $binary_remote_addr 5m;
limit_conn slimits 5;

## START Server context changes

server {

# Domain access

	if ($host !~ ^(INSERT OUR HOST HERE)$ ) {return 444
	}

# Methods

	if ($request_method !~ ^(GET|HEAD|POST)$ ) {return 444;}
	}

# Terminal access - do we want to block?

	if ($http_user_agent ~* LWP::Simple|BBBike|wget) {return 403;
	}
}

## END Server context changes

## START Location context changes

# Prevent image hotlinking - ref http://nginx.org/en/docs/http/ngx_http_referer_module.html

location ~ .(gif|png|jpe?g)$ {
	valid_referers none blocked; 
	if ($invalid_referer) {
	return   403;
	}
}