## Using Dust Templates

The dust templates should be pre-compiled, so if you edit them, you'll need to run a command from this directory like so:

```
dustc -n=result dust-src/result.dust dust-compiled/result.js
```

If you don't include the `-n` flag and template name, you'll get errors about Dust not being able to find the template. 
