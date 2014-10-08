/*
  JAVA can only return Number and String
	array and buffer return in string format
	need JSON.parse
*/
var verbose=1;

var readSignature=function(pos,cb) {
	//console.debug("read signature");
	var signature=kfs.readUTF8String(this.handle,pos,1);
	//console.debug(signature,signature.charCodeAt(0));
	cb.apply(this,[signature]);
}
var readI32=function(pos,cb) {
	//console.debug("read i32");
	var i32=kfs.readInt32(this.handle,pos);
	//console.debug(i32);
	cb.apply(this,[i32]);	
}
var readUI32=function(pos,cb) {
	//console.debug("read ui32");
	var ui32=kfs.readUInt32(this.handle,pos);
	//console.debug(ui32);
	cb.apply(this,[ui32]);
}
var readUI8=function(pos,cb) {
	//console.debug("read ui8"); 
	var ui8=kfs.readUInt8(this.handle,pos);
	//console.debug(ui8);
	cb.apply(this,[ui8]);
}
var readBuf=function(pos,blocksize,cb) {
	//console.debug("read buffer");
	var buf=kfs.readBuf(this.handle,pos,blocksize);
	var buff=JSON.parse(buf);
	//console.debug("buffer length"+buff.length);
	cb.apply(this,[buff]);	
}
var readBuf_packedint=function(pos,blocksize,count,reset,cb) {
	//console.debug("read packed int, blocksize "+blocksize);
	var buf=kfs.readBuf_packedint(this.handle,pos,blocksize,count,reset);
	var adv=parseInt(buf);
	var buff=JSON.parse(buf.substr(buf.indexOf("[")));
	//console.debug("packedInt length "+buff.length+" first item="+buff[0]);
	cb.apply(this,[{data:buff,adv:adv}]);	
}


var readString= function(pos,blocksize,encoding,cb) {
	//console.debug("readstring"+blocksize+" "+encoding);
	if (encoding=="ucs2") {
		var str=kfs.readULE16String(this.handle,pos,blocksize);
	} else {
		var str=kfs.readUTF8String(this.handle,pos,blocksize);	
	}
	 
	if (str.length>10) {
		str=str.substring(0,10)+"...";
	}
	//console.debug(str);
	cb.apply(this,[str]);	
}

var readFixedArray = function(pos ,count, unitsize,cb) {
	//console.debug("read fixed array"); 
	var buf=kfs.readFixedArray(this.handle,pos,count,unitsize);
	var buff=JSON.parse(buf);
	//console.debug("array length"+buff.length);
	cb.apply(this,[buff]);	
}
var readStringArray = function(pos,blocksize,encoding,cb) {
	//console.log("read String array "+blocksize +" "+encoding); 

	var buf=kfs.readStringArray(this.handle,pos,blocksize,encoding);
	//var buff=JSON.parse(buf);
	//console.debug("read string array");
	var buff=buf.split("\uffff"); //cannot return string with 0
	//console.debug("array length"+buff.length);
	cb.apply(this,[buff]);	
}
var free=function() {
	////console.log('closing ',handle);
	kfs.close(this.handle);
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
		this.size=kfs.getFileSize(this.handle);
		//console.log("filesize  "+this.size);
		if (cb)	cb.call(this);
	}

	this.handle=kfs.open(path);
	this.opened=true;
	setupapi.call(this);
	return this;
}

module.exports=Open;