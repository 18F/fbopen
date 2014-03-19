
# Nginx Guidelines

Adapted from http://www.cyberciti.biz/tips/linux-unix-bsd-nginx-webserver-security.html

Since we are compiling nginx, we should not build modules we don't need to reduce the attack surface. ref: http://wiki.nginx.org/Modules 

```
./configure --without-http_empty_gif_module --without-http_geo_module --without-http_gzip_module --without-http_limit_conn_module --without-http_map_module --without-http_ssi_module --without-http_split_clients_module --without-http_scgi_module --without-http_rewrite_module --without-http_proxy_module --without-http_referer_module --without-http_userid_module
```

Included in this repo is ```nginx.conf```. It already has the below changes ready to go.

## HTTP Context

Within: 

	http {
	(...)
	}

Add the following.
 
### Size Limits & Buffer Overflows prevention


	client_body_buffer_size  1K;
	client_header_buffer_size 1k;
	client_max_body_size 1k;
	large_client_header_buffers 2 1k;


### Timeouts


	client_body_timeout   10;
	client_header_timeout 10;
	keepalive_timeout     5 5;
	send_timeout          10;


### Control maximum number of simultaneous connections for one session i.e.


	limit_zone slimits $binary_remote_addr 5m;
	limit_conn slimits 5;

### Prevent framing

	add_header X-Frame-Options DENY;

## Server context changes

Within:


	server {
	(...)
	}


Add the following.

### Domain access

	if ($host !~ ^(INSERT OUR HOST HERE)$ ) {return 444
	}

### Methods

	if ($request_method !~ ^(GET|HEAD|POST)$ ) {return 444;}
	}

### Terminal access - do we want to block?

	if ($http_user_agent ~* LWP::Simple|BBBike|wget) {return 403;
	}
}

## Location context changes

Prevent image hotlinking - ref: http://nginx.org/en/docs/http/ngx_http_referer_module.html

	location ~ .(gif|png|jpe?g)$ {
		valid_referers none blocked; 
		if ($invalid_referer) {
		return   403;
		}
	}