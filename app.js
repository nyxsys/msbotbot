const botbuilder = require('botbuilder');
const restify = require('restify');
//const request = require('request');


const { createNumberPrompt } = require('botbuilder-prompts');
const { ConversationState, MemoryStorage } = require('botbuilder');
const storage = new MemoryStorage();
const FallBack = require('./fallback');
const fallBack = new FallBack.FallBack();
const roll = new RegExp(/(\d+) ?d ?(\d+)/, 'i');

//helper functions and initializations
//translation of value from String and setting ranges
const dicePrompt = createNumberPrompt((context, value) => {
  if(value !== undefined && value >= 1 && value <= 100){
    return Math.floor(value);
  }
  return undefined;  
});

//array summation
const reducer = (acc, current) => acc + current;

//cleaner string formatting
if(!String.prototype.format){
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match,number){
      return typeof args[number] != 'undefined'
      ? args[number] : match;
    });
  };
}

// Create server
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`${server.name} listening to ${server.url}`);
});


const adapter = new botbuilder.BotFrameworkAdapter({ 
    appId: process.env.MICROSOFT_APP_ID, 
    appPassword: process.env.MICROSOFT_APP_PASSWORD 
});

const conversationState = new ConversationState(new MemoryStorage());

adapter.use(conversationState);
adapter.use(fallBack);

// Listen for incoming requests 
server.post('/api/messages', (req, res) => {
    // Route received request to adapter for processing
    adapter.processRequest(req, res, (context) => {
        if (context.request.type === 'message') {
          const state = conversationState.get(context);
          const message  = context.request.text.toLowerCase();
          if(state.prompt === "amount"){
            return(dicePrompt.recognize(context).then((amount) => {
              if(amount != undefined) {
                state.amount = amount;
                state.prompt = "value";
                return dicePrompt.prompt(context, "Please tell me what value you would like the dice to be.");
              }
              else{
                return dicePrompt.prompt(context, 'Please make sure to enter a valid number between one and one hundred.');
              }
            }));
          }
          else if(state.prompt === "value"){   
            return(dicePrompt.recognize(context).then((diceValue) => {
              if(diceValue != undefined) {
                state.diceValue = diceValue;
                state.prompt = "complete";
                context.responded = true;
                return getRoll(state.amount, state.diceValue, function(roll){
                  return rollResult(context, state.amount, state.diceValue, roll);
                });
              }
              else{
                return dicePrompt.prompt(context, 'Please make sure to enter a valid number between one and one hundred.');
              }
            }));
          } else {
            if(message.indexOf("roll") >= 0){
                var diceValue = message.match(roll);
                if(diceValue){
                  context.responded = true;
                  return getRoll(diceValue[1], diceValue[2],function(roll){
                    return rollResult(context, diceValue[1], diceValue[2], roll);
                  });
                } else {
                  state.prompt = "amount";
                  return dicePrompt.prompt(context, "Please tell me how many dice you'd like to roll. ");
                }
            }
        }
    }
  });
});

function rollResult(context, amount, value, roll){
  if(roll.length > 1){
    return context.sendActivity("Rolling {0}d{1}, The Results are {2}, the sum is {3}".format(amount, value, roll, roll.reduce(reducer)));
  }
  else{
    return context.sendActivity("Rolling {0}d{1}, The Result is {2}".format(amount, value, roll));
  }
}


function getRoll(amount, value, callback){
  var i;
  var rolls = [];
  for(i = 0; i < amount; i++ ){  
    rolls.push(Math.floor(Math.random() * value) + 1);
  }
  callback(rolls);
  
  /*
  const endpoint = "http://www.random.org/integers/?num={0}&min=1&max={1}&col={0}&base=10&format=plain&rnd=new".format(amount,value);
  
  callback(request({
    method: 'GET',
    uri: endpoint
  }, function(err,res,body){
    return body;
  }));
  */
}


