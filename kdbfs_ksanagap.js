/*
  JAVA can only return Number and String
	array and buffer return in string format
	need JSON.parse
*/
var readSignature=function(pos,cb) {
	//console.log("read signature");
	var signature=fs.readStringSync(this.handle,pos,1);
	//console.log(signature);
	cb.apply(this,[signature]);
}
var readI32=function(pos,cb) {
	//console.log("read i32");
	var i32=fs.readInt32Sync(this.handle,pos);
	//console.log(i32);
	cb.apply(this,[i32]);	
}
var readUI32=function(pos,cb) {
	//console.log("read ui32");
	var ui32=fs.readUInt32Sync(this.handle,pos);
	//console.log(ui32);
	cb.apply(this,[ui32]);
}
var readUI8=function(pos,cb) {
	//console.log("read ui8"); 
	var ui8=fs.readUInt8Sync(this.handle,pos);
	//console.log("ui8="+ui8);
	cb.apply(this,[ui8]);
}
var readBuf=function(pos,blocksize,cb) {
	//console.log("read buffer");
	var buf=fs.readBufSync(this.handle,pos,blocksize);
	var buff=JSON.parse(buf);
	//console.log(buff);
	cb.apply(this,[buff]);	
}
var readBuf_packedint=function(pos,blocksize,count,reset,cb) {
	//console.log("read packed int3");
	var buf=fs.readBufSync_packedint(this.handle,pos,blocksize,count,reset);
	var adv=parseInt(buf);
	var buff=JSON.parse(buf.substr(buf.indexOf("[")));
	//console.log(buff.length);
	cb.apply(this,[{data:buff,adv:adv}]);	
}


var readString= function(pos,blocksize,encoding,cb) {
	//console.log("readstring"+blocksize+" "+encoding);
	var str=fs.readEncodedStringSync(this.handle,pos,blocksize,encoding);
	//console.log(str);
	cb.apply(this,[str]);	
}

var readFixedArray = function(pos ,count, unitsize,cb) {
	//console.log("read fixed array"); 
	var buf=fs.readFixedArraySync(this.handle,pos,count,unitsize);
	var buff=JSON.parse(buf);
	//console.log(buff.length);
	cb.apply(this,[buff]);	
}
var readStringArray = function(pos,blocksize,encoding,cb) {
	//console.log("read String array "+blocksize +" "+encoding); 

	var buf=fs.readStringArraySync(this.handle,pos,blocksize,encoding);
	//var buff=JSON.parse(buf);
	//console.log(buf);
	var buff=buf.split("\uffff"); //cannot return string with 0
	//console.log(buff.length);
	cb.apply(this,[buff]);	
}
var free=function() {
	////console.log('closing ',handle);
	fs.closeSync(this.handle);
}
var Open=function(path,opts,cb) {
	opts=opts||{};
	var signature_size=1;
	var setupapi=function() { 
		this.readSignature=readSignature;
		this.readI32=readI32;
		this.readUI32=readUI32;
		this.readUI8=readUI8;
		this.readBuf=readBuf;
		this.readBuf_packedint=readBuf_packedint;
		this.readFixedArray=readFixedArray;
		this.readString=readString;
		this.readStringArray=readStringArray;
		this.signature_size=signature_size;
		this.free=free;
		this.size=fs.getFileSize(this.handle);
		//console.log("filesize  "+this.size);
		if (cb)	cb.call(this);
	}

	this.handle=fs.openSync(path);
	this.opened=true;
	setupapi.call(this);
	return this;
}

module.exports=Open;