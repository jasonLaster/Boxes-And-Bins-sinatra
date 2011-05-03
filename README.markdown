# Boxes and Bins
Boxes and Bins is a contextual text editor, i'll describe what that means in more depth later.


## Next Steps
I've recently begun porting the rails code over to sinatra. The rational is that at this point, Boxes and Bins has a pretty simple backend, so the framework should reflect that.

In order to complete the migration, I need to:
1. setup the schema.

2. create a template page, which will be copied everytime a new page is created.

3. port the models over, so that we can get all the content we need for each new page or page load.