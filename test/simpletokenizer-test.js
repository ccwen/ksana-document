var tkr=require('../tokenizers').simple;

QUnit.test('simple tokenizer',function(){
	var s="abc  xyz.一二三";
  
	var res=tkr(s);
	console.log(res.tokens)
	equal(res.tokens[0],"abc  ");
  equal(s,res.tokens.join('')); //make sure nothing is lost

  
});

