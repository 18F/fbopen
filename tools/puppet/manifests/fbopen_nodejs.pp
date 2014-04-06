import "fbopen_sails"

class fbopen_nodejs {

  #Install Node and NPM. may want make install to be true in future
  class { 'nodejs':
      version => 'v0.10.25',
      make_install => false,
  }

  $packages = ['python2.7']
  package {$packages:}

  package {'grunt-cli':
    provider    => 'npm',
  }

  package {'forever':
    provider  => 'npm',
  }

   exec { 'npm_fbopen_install':
    command   => "npm install",
    cwd       => "/vagrant/api",
    require  => Class['nodejs'],
  }
}
