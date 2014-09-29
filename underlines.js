/*
  input : markups start and len
  output:
     each token has an array of 
			[markup idx , start_middle_end , level ]

			markup idx is the nth markup in markup array
			start=1, middle=0, end=2, both=3

 for converting to css style

 base on http://codepen.io/anon/pen/fHben by exebook@gmail.com
*/
var getTextLen=function(markups) {
	var textlen=0;
	markups.map(function(m){
		if (m[0]+m[1]>textlen) textlen=m[0]+m[1];
	});
	return textlen;
}

var calculateLevels=function(M) {
	//M = M.sort(function(a, b) { return b.len - a.len } ); // sort longest first
	var textlen=getTextLen(M);
	var levels=[],out=[];
	for (var i = 0; i < textlen; i++) levels[i] = [];

	for (var i = 0; i < M.length; i++) {
		var max = -1, pos = M[i][0], count = M[i][1];
		// find how many taken levels are here
		for (var x = pos; x < pos + count; x++) {
			if (levels[x].length > max) max = levels[x].length;
		}
		// check if there is an empty level
		level = max;
		for (var l = 0; l < max; l++) {
			var ok = true ;
			for (var m = pos; m < pos + count; m++) {
				if (levels[m][l] != undefined) { ok = false; break }
			}
			if (ok) { level = l; break }
		}
		out.push([i,level]);
		// fill the level
		for (var x = pos; x < pos + count; x++)	levels[x][level] = i;
	}
	return out;
}

var TAG_START=0, TAG_END=1;
var fixOverlaps=function(S) {
	// insert extra tags because we cannot have overlaps in html
	var out = [], stack = [] ,lstack=[];
	for (i = S.length - 1; i >= 0; i--) {
		var id=S[i][0], pos=S[i][1],tagtype=S[i][2], level=S[i][3];
		if (tagtype == TAG_START) { 
			stack.push(id);
			lstack.push(level);
			out.unshift(S[i]);
		}	else if (tagtype == TAG_END) {
			if (id == stack[stack.length - 1]) {
				stack.pop();
				lstack.pop();
				out.unshift(S[i]);
			} else {
				var z = stack.length - 1;
				while (z > 0 && stack[z] != id) {
					out.unshift([stack[z], pos, TAG_END, lstack[z]]);
					z--;
				}
				out.unshift([stack[z], pos, TAG_END, lstack[z]]);
				stack.splice(z, 1);
				lstack.splice(z, 1);
				while (z < stack.length) {
					out.unshift([stack[z], pos, TAG_START,  lstack[z]]);
					z++;
				}
			} 
		}
	}
	return out
}
var levelMarkups=function(M) {
	var P=calculateLevels(M), S = [];

	for (var p = 0; p < P.length; p++) {
		S.push([p,M[p][0],TAG_START,P[p][1]]); // id, pos, tagtype, level
		S.push([p,M[p][0]+M[p][1],TAG_END,P[p][1]]);
	}
	S = S.sort(function(a, b){ 
		if (b[1] == a[1]) {
			if (b[2] == TAG_START && a[2] == TAG_END) return 1;
			if (a[2] == TAG_START && b[2] == TAG_END) return -1;
		}
		return b[1] - a[1];
	});

	/* s[0] == markup id , s[1]==pos , s[2]==tagtype  */
	S = fixOverlaps(S);
	return S;
}
var renderXML=function(tokens, M) {
	var S=levelMarkups(M);

	var idx=0,out="";
	for (var i=tokens.length;i>0;i--) {
		while (idx<S.length && S[idx][1]==i) {
			var id=S[idx][0], tagtype=S[idx][2] ;
			var tag = M[id][2] , level=S[idx][3] ; //level=P[id][1];
			if (tagtype==TAG_START) out= '<'+tag+' lv="'+level+'">' +out;
			if (tagtype==TAG_END) out= '</'+tag+'>' +out;
			idx++;
		}
		out=tokens[i-1]+out;
	}
	return out;//return text
}
module.exports={calculateLevels:calculateLevels, levelMarkups:levelMarkups,renderXML:renderXML};

/*
var indexOfSorted = function (array, obj) {  //taken from ksana-document/bsearch.js
  var low = 0,
  high = array.length;
  while (low < high) {
    var mid = (low + high) >> 1;
    if (array[mid]==obj) return mid;
    array[mid] < obj ? low = mid + 1 : high = mid;
  }
	if (array[low]==obj) return low;else return -1;
};

var getTextLen=function(markups) {
	var textlen=0;
	markups.map(function(m){
		if (m[0]+m[1]>textlen) textlen=m[0]+m[1];
	});
	return textlen;
}

var calculateLevel=function(markups,textlen) {
	textlen=textlen||getTextLen(markups);
	var startarr=markups.map(function(m,idx){return [m[0],idx]})
	              .sort(function(a,b){return a[0]-b[0]});

	var startat =startarr.map(function(m){return m[0]});
	var startidx=startarr.map(function(m){return m[1]});

	var endarr  =markups.map(function(m,idx){return [m[0]+m[1]-1,idx]})
	              .sort(function(a,b){return a[0]-b[0]});

	var endat =endarr.map(function(m){return m[0]}); // sort by token offset
	var endidx=endarr.map(function(m){return m[1]}); //markup index
	
	var levels=[],level=0;
	var out=[];
	for (var i=0;i<textlen;i++) {
		var tokenout=[]; 
		var starts=[],ends=[];
		var mstart=indexOfSorted(startat,i); //don't need , because one pass
		while (startat[mstart]==i) {  //find out all markups start at this token
			starts.push(startidx[mstart]);
			mstart++;
		}

		var mend=indexOfSorted(endat,i);
		while (endat[mend]==i) {  // find out all markups end at this token
			ends.push(endidx[mend]); //push the idx in markups
			mend++;
		}

		//insert new markup
		starts.map(function(s,idx){
			var j=0;
			while (typeof levels[j]!=="undefined") j++;
			levels[j]=[s,1];
		});
		
		//marked the ended
		ends.map(function(e,idx){
			for (var j=0;j<levels.length;j++) {
				var lv=levels[j];
				if (!lv) continue;
				if (lv[0]==e) lv[1]+=2;//mark end
			}
		});

		levels.map(function(lv,idx,L){
			if (!lv) return ;
			tokenout.push([lv[0],lv[1],idx]);
			if(lv[1]==1) lv[1]=0;
			else if (lv[1]>=2) L[idx]=undefined; //remove the ended markup
		});
		
		out[i]=tokenout;
	}
	//levels.length , max level 

	return out;
}

var renderXML=function(tokens,markups,levels) {
	var out=[];
	for (var i=0;i<tokens.length;i++) {
		var s=tokens[i];
		if (levels[i]) {
			for (var j=0;j<levels[i].length;j++) {
				var lv=levels[i][j];
				var tag=markups[lv[0]][2];
				if ((lv[1]&1)==1) {
					s="<"+tag+">"+s;
				} else if ((lv[1]&2)==2) {
					s=s+"</"+tag+">";
				}
			}
		}
		//out+=s;
	}
	return out;
}
*/