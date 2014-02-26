var D=require('./document');
var unitsep=/<pb n="([^"]*?)"\/>/g 
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

	if (s[i]=='/') {
		return {name:name,type:'empty'}
	} else {
		var attr=[];
		s.substring(i+1).replace(/(.*)=(.*)/g,function(m,m1,m2) {
			attr.push([m1,m2.substring(1,m2.length-1)]);
		});
		return {name:name,type:'start',attr:attr}
	}
}
var parseUnit=function(name,unit,doc) {
	// name,spg, soff, epg, eoff , attributes
	var parsed=unit.replace(/<(.*?)>/g,function(m,m1,offset){
		var tag=parseXMLTag(m1);
		if (tag.type=='end') {
			tag=tagstack.pop();
			if (tag.name!=m1.substring(1)) {
				throw 'unbalanced tag at unit '+name+' '+unit;
			}
			if (tag.spg!=name) tag.epg=name;
			if (tag.soff!=offset) tag.eoff=offset;
		} else {
			tag.spg=name;tag.soff=offset;
			if (tag.type=='start') tagstack.push(tag);
			tags.push(tag);
		}
		return ""; //remove the tag from inscription
	})
	return {inscription:parsed, tags:tags};
}
var splitUnit=function(buf) {
	var units=[], unit="", last=0 ,name="";
	buf.replace(unitsep,function(m,m1,offset){
		units.push([name,buf.substring(last,offset)]);
		name=m1;
		last=offset+m.length; 
	})
	units.push([name,buf.substring(last)]);
	return units;
}
var importxml=function(buf,opts) {
	var doc=D.createDocument();
	var units=splitUnit(buf);
	units.map(function(U){
		var out=parseUnit(U[0],U[1],doc)
		doc.createPage(out.inscription);
	});
	if (tagstack.length) {
		throw 'tagstack not null'+JSON.stringify(tagstack)
	}
	doc.xmltags=tags;
	return doc;
}
module.exports=importxml;