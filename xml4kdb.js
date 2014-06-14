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
var parseUnit=function(unitseq,unittext) {
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
var unitsep=/<_ id="([^"]*?)"\/>/g  ;
var parseXML=function(buf, opts){
	opts=opts||{};
	var units=splitUnit(buf,opts.sep || unitsep);
	var texts=[], tags=[] , names=[];
	units.map(function(U,i){
		var out=parseUnit(i,U[1]);
		names.push(U[0]);
		texts.push(out.inscription);
		tags.push(out.tags)
	});
	return {names:names,texts:texts,tags:tags};
};
var D=require("ksana-document").document;

var importJson=function(json) {
	d=D.createDocument();
	for (var i=1;i<json.texts.length;i++) {
		var markups=json.tags[i];
		d.createPage({n:json.names[i],t:json.texts[i]});
	}
	return d;
}
var exportXML=function(){

};
module.exports={parseXML:parseXML, importJson:importJson, exportXML:exportXML}