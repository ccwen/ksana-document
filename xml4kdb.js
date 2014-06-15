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
var parseUnit=function(unittext) {
	// name,sunit, soff, eunit, eoff , attributes
	var totaltaglength=0,tags=[];
	var parsed=unittext.replace(/<(.*?)>/g,function(m,m1,off){
		tags.push([off-totaltaglength , m1]);
		totaltaglength+=m.length;
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
var defaultsep="_.id";

var parseXML=function(buf, opts){
	opts=opts||{};
	var sep=opts.sep||defaultsep;
	var unitsep=new RegExp('<'+sep.replace("."," ")+'="([^"]*?)"/>' , 'g')  ;
	var units=splitUnit(buf, unitsep);
	var texts=[], tags=[] , names=[];
	units.map(function(U,i){
		var out=parseUnit(U[1]);
		names.push(U[0]);
		texts.push(out.inscription);
		tags.push(out.tags);
	});
	return {names:names,texts:texts,tags:tags,sep:sep};
};
var D=require("ksana-document").document;

var importJson=function(json) {
	d=D.createDocument();
	for (var i=0;i<json.texts.length;i++) {
		var markups=json.tags[i];
		d.createPage({n:json.names[i],t:json.texts[i]});
	}
	d.setTags(json.tags);
	d.setSep(json.sep);
	return d;
}
/*
    doc.tags hold raw xml tags, offset will be adjusted by evolvePage.
    should not add or delete page, otherwise the export XML is not valid.
*/
var exportXML=function(doc){
	var out=[],tags=null;
	for (var i=1;i<doc.pageCount;i++) {
		var pg=doc.getPage(i);
		if (!pg.isLeafPage()) continue;
		var origin=pg.getOrigin();         //doc.tags doesn't keep multiversion
		var tags=doc.tags[origin.id-1];  //get the xml tags
		var tagnow=0,text="";
		var t=pg.inscription;
		if (i>1) {
			text='<'+doc.sep.replace("."," ")+'="'+pg.name+'"/>';
		}
		for (var j=0;j<t.length;j++) {
			if (tagnow<tags.length) {
				if (tags[tagnow][0]==j) {
					text+="<"+tags[tagnow][1]+">";
					tagnow++;
				}
			}
			text+=t[j];
		}
		if (tagnow<tags.length && j==tags[tagnow][0]) text+="<"+tags[tagnow][1]+">";
		out.push(text);
	}
	return out.join("");
};
module.exports={parseXML:parseXML, importJson:importJson, exportXML:exportXML}