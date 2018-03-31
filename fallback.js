class FallBack {
  async onProcessRequest (context, next){
    await next();
    if(!context.responded){
      context.sendActivity("Sorry, I didn't quite catch that. I can only really roll dice.");
    }
  }
}

exports.FallBack = FallBack;