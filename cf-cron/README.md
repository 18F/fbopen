# cf-cron
Run cron jobs in a Cloud Foundry app.

### Usage:

This app expects a few environment variables and a user-provided service.

##### Variables:

* `CF_CREDS:`<br>
  **Description:** The name of a user-provided service holding secrets for use by the prep or job scripts.<br>
  **Example:** `cf-cron-creds`
  
* `PREP_JOB:`<br> 
    **Description:** An optional job which runs once, prior to the recurring job. Takes an array-formatted command with optional parameters. Specify a script here to avoid unexpected issues with variable expansion.<br>

   **Example:** `"/bin/bash, prep.sh"`
   
* `CRON_JOB:`<br>
  **Description:** The recurring job. An array-formatted command with optional parameters. Specify a script here to avoid unexpected issues with variable expansion.<br>
   **Example:** `"/bin/bash, job.sh, creds.username, creds.password"`
   
   Parameters passed to `PREP_JOB` and `CRON_JOB` with the `creds.` prefix will eval to variables held in the user-provided service specified by `CF_CREDS`.
   
* `CRON_SCHEDULE:`<br>
  **Description:** A cron schedule. For more information see: [Cron Ranges](https://www.npmjs.com/package/cron#cron-ranges).<br>
   **Example:** `"0 * * * * *"`

##### Credential Service:

Create a user-provided service to hold a credentials or other non-public variables.

```
cf cups cf-cron-creds -p '{"username":"user", "password":"password"}'
```

### Running the Example:

Create the credential service.

```
cf cups cf-cron-creds -p '{"username":"user", "password":"password"}'
```

Push the app.

```
cf push
```
The app will echo oncer per second until stopped.

```
OUT Started...
OUT Prep_Exit:0
OUT Scheduling...
OUT Job_Out: Yes, we're prepped with - Username: user - Password: password
```
