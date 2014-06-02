var D=require('./document');
var unitsep=/<pb n="([^"]*?)"\/>/g  ;
/*
	inline tag
*/
var tags=[];
var tagstack=[];
var parseXMLTag=function(s) {
	var name="",i=0;
	if (s[0]=='/') {
		return {name:s.substring(1),type:'end'};
	}

	while (s[i] && (s.charCodeAt(i)>0x30)) {name+=s[i];i++;}

	var type="start";
	if (s[s.length-1]=='/') { type="emtpy"; }
	var attr={},count=0;
	s=s.substring(name.length+1);
	s.replace(/(.*?)="([^"]*?)"/g,function(m,m1,m2) {
		attr[m1]=m2;
		count++;
	});
	if (!count) attr=undefined;
	return {name:name,type:type,attr:attr};
};
var parseUnit=function(unitseq,unittext,doc) {
	// name,sunit, soff, eunit, eoff , attributes
	var totaltaglength=0;
	var parsed=unittext.replace(/<(.*?)>/g,function(m,m1,off){
		var tag=parseXMLTag(m1);
		tag.seq=unitseq;
		var offset=off-totaltaglength;
		totaltaglength+=m.length;
		if (tag.type=='end') {
			tag=tagstack.pop();
			if (tag.name!=m1.substring(1)) {
				throw 'unbalanced tag at unit  '+unittext;
			}
			if (tag.sunit!=unitseq) tag.eunit=unitseq;
			if (tag.soff!=offset) tag.eoff=offset;
		} else {
			tag.sunit=unitseq;tag.soff=offset;
			if (tag.type=='start') tagstack.push(tag);
			tags.push(tag);
		}
		return ""; //remove the tag from inscription
	});
	return {inscription:parsed, tags:tags};
};
var splitUnit=function(buf,sep) {
	var units=[], unit="", last=0 ,name="";
	buf.replace(sep,function(m,m1,offset){
		units.push([name,buf.substring(last,offset)]);
		name=m1;
		last=offset+m.length; 
	});
	units.push([name,buf.substring(last)]);
	return units;
};
var addMarkups=function(tags,page){
	tags.map(function(T){
		var start=T.soff;
		var len=0;
		if (T.eoff>T.soff) len=T.eoff-T.soff;
		var payload={name:T.name};
		if (T.attr) payload.attr=T.attr;
		page.addMarkup(start,len,payload);
	});
};
var importxml=function(buf,opts) {
	var doc=D.createDocument();
	if (opts.whole) {
		var name=opts.name||"";
		var out=parseUnit(0,buf,doc);
		if (opts.trim) out.inscription=out.inscription.trim();
		var page=doc.createPage({name:name,text:out.inscription});
		addMarkups(out.tags,page);
	} else {
		var units=splitUnit(buf,opts.sep || unitsep);
		units.map(function(U,i){
			var out=parseUnit(i,U[1],doc);
			if (opts.trim) out.inscription=out.inscription.trim();
			doc.createPage({text:out.inscription,name:U[0]});
		});		
	}

	if (tagstack.length) {
		throw 'tagstack not null'+JSON.stringify(tagstack);
	}
	doc.setTags(tags);
	return doc;
};
module.exports=importxml;