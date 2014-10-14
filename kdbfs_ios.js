/*
  JSContext can return all Javascript types.
*/
var verbose=1;

var readSignature=function(pos,cb) {
	console.log("read signature");
	var signature=kfs.readUTF8String(this.handle,pos,1);
	console.log(signature,signature.charCodeAt(0));
	cb.apply(this,[signature]);
}
var readI32=function(pos,cb) {
	console.log("read i32");
	var i32=kfs.readInt32(this.handle,pos);
	console.log(i32);
	cb.apply(this,[i32]);	
}
var readUI32=function(pos,cb) {
	console.log("read ui32");
	var ui32=kfs.readUInt32(this.handle,pos);
	console.log(ui32);
	cb.apply(this,[ui32]);
}
var readUI8=function(pos,cb) {
	console.log("read ui8"); 
	var ui8=kfs.readUInt8(this.handle,pos);
	console.log(ui8);
	cb.apply(this,[ui8]);
}
var readBuf=function(pos,blocksize,cb) {
	console.log("read buffer");
	var buf=kfs.readBuf(this.handle,pos,blocksize);
	console.log("buffer length"+buff.length);
	cb.apply(this,[buf]);	
}
var readBuf_packedint=function(pos,blocksize,count,reset,cb) {
	console.log("read packed int, blocksize "+blocksize);
	var buf=kfs.readBuf_packedint(this.handle,pos,blocksize,count,reset);
	cb.apply(this,[buf]);
}


var readString= function(pos,blocksize,encoding,cb) {
	console.log("readstring"+blocksize+" "+encoding);
	if (encoding=="ucs2") {
		var str=kfs.readULE16String(this.handle,pos,blocksize);
	} else {
		var str=kfs.readUTF8String(this.handle,pos,blocksize);	
	}
	console.log(str);
	cb.apply(this,[str]);	
}

var readFixedArray = function(pos ,count, unitsize,cb) {
	console.log("read fixed array"); 
	var buf=kfs.readFixedArray(this.handle,pos,count,unitsize);
	console.log("array length"+buff.length);
	cb.apply(this,[buf]);	
}
var readStringArray = function(pos,blocksize,encoding,cb) {
	//console.log("read String array "+blocksize +" "+encoding); 
	encoding = encoding||"utf8";
	console.log("read string array");
	var buf=kfs.readStringArray(this.handle,pos,blocksize,encoding);
	//var buff=JSON.parse(buf);
	//var buff=buf.split("\uffff"); //cannot return string with 0
	console.log("string array length"+buff.length);
	cb.apply(this,[buf]);	
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