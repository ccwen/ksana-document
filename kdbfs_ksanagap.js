/*
  JAVA can only return Number and String
	array and buffer return in string format
	need JSON.parse
*/
var readSignature=function(pos,cb) {
	var signature=fs.readStringSync(this.handle,pos,1);
	cb.apply(this,[signature]);
}
var readI32=function(pos,cb) {
	var i32=fs.readI32Sync(this.handle,pos);
	cb.apply(this,[i32]);	
}
var readUI32=function(pos,cb) {
	var ui32=fs.readUI32Sync(this.handle,pos);
	cb.apply(this,[ui32]);
}
var readUI8=function(pos,cb) {
	var ui8=fs.readUI8Sync(this.handle,pos);
	cb.apply(this,[ui8]);
}
var readBuf=function(pos,blocksize,cb) {
	var buf=fs.readBufSync(this.handle,pos,blocksize);
	var buff=JSON.parse(buf);
	cb.apply(this,[buff]);	
}

var readBuf_packedint=function(pos,blocksize,cb) {
	var buf=fs.readPackedIntSync(this.handle,pos,blocksize);
	var buff=JSON.parse(buf);
	cb.apply(this,[buff]);	
}
var readString= function(pos,blocksize,encoding,cb) {
	var str=fs.readEncodedStringSync(this.handle,pos,blocksize,encoding);
	cb.apply(this,[str]);	
}

var readFixedArray = function(pos ,count, unitsize,cb) {
	var buf=fs.readFixedArraySync(this.handle,pos,count,unitsize);
	var buff=JSON.parse(buf);
	cb.apply(this,[buff]);	
}
var readStringArray = function(pos,blocksize,encoding,cb) {
	var buf=fs.readStringArraySync(this.handle,pos,count,unitsize);
	var buff=JSON.parse(buf);
	cb.apply(this,[buff]);	
}

var Open=function(path,opts,cb) {
	opts=opts||{};
	var signature_size=1;
	var setupapi=function() {
		console.log("setup api");
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
		console.log("filesize "+this.size);
		if (cb)	cb.call(this);
	}
	var free=function() {
		//console.log('closing ',handle);
		fs.closeSync(this.handle);
	}
	console.log("opening2"+path);	
	this.handle=fs.openSync(path);
	this.opened=true;
	setupapi();
}

module.exports=Open;