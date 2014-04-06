import "fbopen_nodejs"
#import "fbopen_postgres"
#import "fbopen_config"

user {'fbopen':
  groups => ['sudo'],
  ensure => present,
  shell => '/bin/false',  #prevent user from logging in?
}

Exec {
    path => [ "/bin/", "/sbin/" , "/usr/bin/", "/usr/sbin/", "/usr/local/node/node-default/bin/" ],
    timeout   => 0,
}

class { 'apt':
  always_apt_update    => true,
  disable_keys         => undef,
  proxy_host           => false,
  proxy_port           => '8080',
  purge_sources_list   => false,
  purge_sources_list_d => false,
  purge_preferences_d  => false,
  update_timeout       => undef
}

#Set system timezone to UTC
class { "timezone":
  timezone => 'UTC',
}

include fbopen_nodejs
#include fbopen_postgres
#include fbopen_config

#class { "solr": }

#class { "solr":
#  install             => "source",
#  install_source      => "http://apache.claz.org/lucene/solr/4.7.1/solr-4.7.1.tgz",
#  install_destination => "/opt/apps/",
#  # install_precommand  => "...",
#  # install_postcommand => "...",
#  # url_check           => "...",
#  # url_pattern         => "...",
#  }

exec { 'start':
  command   => "forever start app.js",
  cwd       => "/vagrant/api",
  require   => Class['npm_fbopen_install'],
  unless    => "ps -ef | grep '[f]orever'"
}