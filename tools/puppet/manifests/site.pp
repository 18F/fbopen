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
  update_timeout       => undef
}

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

#Install Node and NPM
class { 'nodejs':
    version => 'v0.10.25',
    make_install => false,
}

exec { 'npm_fbopen_install':
  command   => "npm install",
  cwd       => "/vagrant/api",
  require  => Class['nodejs'],
}

package {'grunt-cli':
  provider    => 'npm',
  require  => Class['nodejs'],
}

package {'forever':
  provider  => 'npm',
  require  => Class['nodejs'],
}

#Install and configure elasticsearch
exec {"install_key":
  command         => 'wget -O - http://packages.elasticsearch.org/GPG-KEY-elasticsearch | apt-key add -',
}->
apt::source { 'elasticsearch_1.0stable':
  location          => 'http://packages.elasticsearch.org/elasticsearch/1.0/debian',
  release           => 'stable',
  repos             => 'main',
  include_src       => false,
}->
package {'elasticsearch':
  ensure    => 'installed',
}

exec { 'start':
  command   => "forever start app.js",
  cwd       => "/vagrant/api",
  require   => Exec['npm_fbopen_install'],
  unless    => "ps -ef | grep '[f]orever'"
}
