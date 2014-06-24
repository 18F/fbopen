#!/bin/sh

# Hack to remove 'stdin: is not a tty' messages
# See 'https://github.com/mitchellh/vagrant/issues/1673#issuecomment-26650102'
sed -i 's/^mesg n$/tty -s \&\& mesg n/g' /root/.profile

# Directory in which librarian-puppet should manage its modules directory
PUPPET_DIR=/etc/puppet/

# NB: librarian-puppet might need git and ruby-dev/ruby-devel installed. If they
# are not already installed # in your basebox, this will manually install them
# at this point using apt or yum

$(which git > /dev/null 2>&1)
FOUND_GIT=$?

echo 'testing for presence of ruby dev tools... do not be alarmed if there is an error that follows.'
$(ruby -e "puts require 'mkmf'")
case "$?" in
    "true") FOUND_RUBY_DEV=true ;;
    *) FOUND_RUBY_DEV=false ;;
esac

$(which apt-get > /dev/null 2>&1)
FOUND_APT=$?
$(which yum > /dev/null 2>&1)
FOUND_YUM=$?

if [ "${FOUND_YUM}" -eq '0' ]; then
    yum -q -y makecache
    if [ "$FOUND_GIT" -ne '0' ]; then
        yum -q -y install git
        echo 'git installed.'
    fi
    if [ "$FOUND_RUBY_DEV" = false ]; then
        yum -q -y install ruby-devel
        echo 'ruby-devel installed.'
    fi
elif [ "${FOUND_APT}" -eq '0' ]; then
    echo 'updating apt sources...'
    apt-get -qq -y update
    if [ "$FOUND_GIT" -ne '0' ]; then
        echo 'installing git...'
        apt-get -q -y install git-core
        echo 'git installed.'
    fi
    if [ "$FOUND_RUBY_DEV" = false ]; then
        echo 'installing ruby-dev...'
        apt-get -q -y install ruby-dev
        echo 'ruby-dev installed.'
    fi
else
    echo 'No package installer available. You may need to install git manually.'
fi

if [ ! -d "$PUPPET_DIR" ]; then
  mkdir -p $PUPPET_DIR
fi
cp /vagrant/tools/puppet/Puppetfile $PUPPET_DIR

if [ "$(gem search -i librarian-puppet)" = "false" ]; then
  gem install librarian-puppet --no-ri --no-rdoc
  cd $PUPPET_DIR && librarian-puppet install --clean
else
  cd $PUPPET_DIR && librarian-puppet update
fi
