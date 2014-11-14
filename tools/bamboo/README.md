Bamboo Install
==============

Bamboo is used to run the various data loaders in production for FBOpen. While traditionally used as a continuous integration tool, Bamboo's ability to run arbitrary scripts and send email notifications on their build status makes it easier to keep track of nightly data loads and tracking their failures over time. Much of what is mentioned below is available on Atlassian's [support website for Bamboo].


###Dependencies

Bamboo requires: 

- java 1.7 (1.8 will not work)

###Install Steps:

- make a directory for the bamboo install. Then [download bamboo 5.5] and extract it into that directory.

- make a directory that will act as the bamboo home directory.

- Then update this bamboo config file: 
`<Bamboo installation directory>/atlassian-bamboo/WEB-INF/classes/bamboo-init.properties` 
to point to the home directory you just created. 

- `cd` to the bamboo install directory and run the startup script in the bin folder:
`bin/start-bamboo.sh`

###Local Configuration


Bamboo should now be running on port 8085. Navigate to `localhost:8085` and you will be prompted to enter a license. You can get a [free license here] after inputting the server key displayed on the Bamboo homepage.

Once you put in the license, Bamboo will finish installing. 

There is already an instance of bamboo set up on staging. Your best bet is to export the existing configuration from staging and import it into your own instance. You can do this in the global settings menu on the bamboo staging instance. See Alison or Kaitlin for a login.

After you've exported and imported the bamboo instance from staging, you'll need to change some global settings. Many of the environment variables used to run the scripts are stored in global variables section so that they don't need to be repeated across the different scripts. You can change these paths to be specific to your install by clicking on the gear icon in the top right and selecting `global variables`. 

You'll also probably want to change the SMTP settings since you won't want to email the whole team when your local builds run. These are available in the global menu in the Bamboo interface. 

[support website for Bamboo]:https://confluence.atlassian.com/display/BAMBOO/Installing+Bamboo+on+Linux
[download bamboo 5.5]:http://www.atlassian.com/software/bamboo/downloads/binary/atlassian-bamboo-5.5.1.tar.gz
[free license here]:https://my.atlassian.com/license/evaluation



