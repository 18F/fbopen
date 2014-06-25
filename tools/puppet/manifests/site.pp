#Install Node and NPM
class { "nodejs":
  manage_repo => true
}

user {'fbopen':
  groups => ['sudo'],
  ensure => present,
  managehome => true,
  shell => '/bin/bash',
}

Exec {
    path => [ "/bin/", "/sbin/" , "/usr/bin/", "/usr/sbin/", "/usr/local/node/node-default/bin/" ],
    timeout   => 0,
}

#class { 'apt':
#  always_apt_update    => true,
#  update_timeout       => undef
#}

#Set system timezone to UTC
class { "timezone":
  timezone => 'UTC',
}

package { [
    'curl',
    'wget',
    'python-software-properties'
  ]:
  ensure  => 'installed',
}

#Install and configure the python environment
apt::ppa { 'ppa:fkrull/deadsnakes': }->
package {['python3.4', 'python3.4-dev']:
  ensure  => 'installed',
}

vcsrepo {'/home/fbopen/fbopen':
    ensure => present,
    provider => git,
    source => 'https://github.com/18F/fbopen.git',
    user => 'fbopen',
    revision => 'esearch'
}->
exec { 'npm_fbopen_install':
  command   => "npm install",
  cwd       => "/home/fbopen/fbopen/api",
  require   => Class['nodejs']
}->
file { 'fbopen_api_log':
  path => '/var/log/fbopen/api.log',
  ensure => 'present'
}->
file { '/home/fbopen/fbopen/api/config.js':
  ensure => '/home/fbopen/fbopen/api/config-sample_dev.js',
}

#Install and configure elasticsearch
exec {"install_key":
  command         => 'wget -O - http://packages.elasticsearch.org/GPG-KEY-elasticsearch | apt-key add -',
}->
apt::source { 'elasticsearch_1.1stable':
  location          => 'http://packages.elasticsearch.org/elasticsearch/1.0/debian',
  release           => 'stable',
  repos             => 'main',
  include_src       => false,
}->
package {'elasticsearch':
  ensure    => 'installed',
}

file { "api_upstart":
  path => '/etc/init/fbopen_api.conf',
  ensure => 'link',
  target => '/home/fbopen/fbopen/api/fbopen_api.conf',
}->
exec { "upstart_conf_chmod":
  command => "chmod 0644 /etc/init/fbopen_api.conf"
}->
exec { "upstart_reload":
  command => "initctl reload-configuration"
}->
file { '/var/log/upstart/fbopen_api.log':
  ensure => 'exists'
}->
service { 'fbopen_api':
  provider => 'upstart',
  ensure => 'running',
  require => [ Exec['npm_fbopen_install'], Package['elasticsearch'] ]
}

exec { 'serve_web':
  command => 'python3.4 -m http.server',
  cwd => '/home/fbopen/fbopen/sample-www',
  require => Exec['npm_fbopen_install']
}
