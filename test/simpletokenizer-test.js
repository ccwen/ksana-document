var tkr=require('../tokenizers').simple;

QUnit.test('simple tokenizer',function(){
	var s="abc  [xyz.𪚥二三";
  
	var res=tkr(s);
	console.log(res.tokens)
	equal(res.tokens[0],"abc  ");
	equal(res.tokens[1],"[");
	equal(res.tokens[2],"xyz.");
	equal(res.tokens[3],"𪚥");
	equal(res.tokens[4],"二");
      equal(s,res.tokens.join('')); //make sure nothing is lost
});

QUnit.test('simple tokenizer',function(){
	var s="q]中文";
  
	var res=tkr(s);
	console.log(res.tokens)
	equal(res.tokens[0],"q");
	equal(res.tokens[1],"]");
	equal(res.tokens[2],"中");
	equal(res.tokens[3],"文");
      equal(s,res.tokens.join('')); //make sure nothing is lost
  
});

