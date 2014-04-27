var splitDelete=function(m) {
	var out=[];
	for (i=0;i<m.len;i++) {
		var m2=JSON.parse(JSON.stringify(m));
		m2.start=m.start+i;
		m2.len=1;
		out.push(m2);
	}
	return out;
}
var quantize=function(markup) {
	var out=[],i=0,m=JSON.parse(JSON.stringify(markup));
	if (m.payload.insert) {
			m.start=m.start+m.len-1;
			m.len=1;
			out.push(m)
	} else {
		if (m.payload.text=="") { //delete
			out=splitDelete(m);
		} else { //replace
			if (m.len>1) {//split to delete and replace
				var m2=JSON.parse(JSON.stringify(m));
				m.payload.text="";
				m.len--;
				out=splitDelete(m);
				m2.start=m2.start+m2.len-1;
				m2.len=1;
				out.push(m2);
			} else {
				out.push(m);
			}
		}
	}
	return out;
}
var plural={
	"suggest":"suggests"
}
var combineDelete=function(markups) {
	var out=[],i=1,at=0;

	while (i<markups.length) {
		if (markups[at].payload.choices.length===1 && 
			  markups[at].payload.choices[0].text==="" &&
			  markups[i].payload.choices.length===1 && 
			  markups[i].payload.choices[0].text===""
			  ) {
			markups[at].len++;
		} else {
			out.push(markups[at]);
			at=i;
		}
		i++;
	}
	out.push(markups[at]);
	return out;
}
var merge=function(markups,type){
	var out=[],i=0;
	for (i=0;i<markups.length;i++) {
		if (markups[i].payload.type===type)	out=out.concat(quantize(markups[i]));
	}
	var type=plural[type];
	if (typeof type=="undefined") throw "cannot merge "+type;
	if (!out.length) return [];
	out.sort(function(a,b){return a.start-b.start;});
	var out2=[{start:out[0].start, len:1, payload:{type:type,choices:[out[0].payload]}}];
	for (i=1;i<out.length;i++) {
		if (out[i].start===out2[out2.length-1].start ) {
			out2[out2.length-1].payload.choices.push(out[i].payload);
		} else {
			out2.push({start:out[i].start,payload:{type:type,choices:[out[i].payload]}});
		}
	}
	return combineDelete(out2);
}
module.exports={merge:merge,quantize:quantize}