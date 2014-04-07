#import "fbopen_nodejs"
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



#Install and configure the python environment
#  $packages = []

apt::ppa { 'ppa:fkrull/deadsnakes': }

#->
#package {'python3.r':}

#class { 'python':
#  version    => '3.3',
#  pip        => true,
#  dev        => true,
#  virtualenv => false,
#  gunicorn   => false,
#}

#Install Node and NPM. may want make install to be true in future
#class { 'nodejs':
#    version => 'v0.10.25',
#    make_install => false,
#}
#
#exec { 'npm_fbopen_install':
#  command   => "npm install",
#  cwd       => "/vagrant/api",
#  require  => Class['nodejs'],
#}
#
#package {'grunt-cli':
#  provider    => 'npm',
#  require  => Class['nodejs'],
#}
#
#package {'forever':
#  provider  => 'npm',
#  require  => Class['nodejs'],
#}

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

#Install and configure elasticsearch
#class{"elasticsearch":
#   config                   => {
#     'node'                 => {
#       'name'               => 'elasticsearch001'
#     },
#     'index'                => {
#       'number_of_replicas' => '0',
#       'number_of_shards'   => '5'
#     },
#     'network'              => {
#       'host'               => $::ipaddress
#     }
#   }
#}
#
#exec { 'start':
#  command   => "forever start app.js",
#  cwd       => "/vagrant/api",
#  require   => Exec['npm_fbopen_install'],
#  unless    => "ps -ef | grep '[f]orever'"
#}