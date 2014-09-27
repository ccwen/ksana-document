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
var calculateLevels=function(tokens,M) {
	//M = M.sort(function(a, b) { return b.len - a.len } ); // sort longest first

	var levels=[],out=[];
	for (var i = 0; i < tokens.length; i++) levels[i] = [];

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
var fixOverlaps=function(S) {
	// insert extra tags because we cannot have overlaps in html
	var out = [], stack = [] ;
	for (i = S.length - 1; i >= 0; i--) {
		var id=S[i][0], pos=S[i][1],type=S[i][2];
		if (type == 0) { 
			stack.push(id); 
			out.unshift(S[i]);
		}	else if (type == 1) {
			if (id == stack[stack.length - 1]) {
				stack.pop();
				out.unshift(S[i]);
			} else {
				var z = stack.length - 1;
				while (z > 0 && stack[z] != id) {
					out.unshift([stack[z], pos, 1]);
					z--;
				}
				out.unshift([stack[z], pos, 1]);
				stack.splice(z, 1);
				while (z < stack.length) {
					out.unshift([stack[z], pos, 0]);
					z++;
				}
			} 
		}
	}
	return out
}
var renderXML=function(tokens, M) {
	var P=calculateLevels(tokens,M), S = [];
	for (var p = 0; p < P.length; p++) {
		S.push([p,M[p][0],0]);
		S.push([p,M[p][0]+M[p][1],1]);
	}
	S = S.sort(function(a, b){ 
		if (b[1] == a[1]) {
			if (b[2] == 0 && a[2] == 1) return 1;
			if (a[2] == 0 && b[2] == 1) return -1;
		}
		return b[1] - a[1];
	});

	S = fixOverlaps(S);

	var idx=0,out="";
	for (var i=tokens.length;i>0;i--) {
		while (idx<S.length && S[idx][1]==i) {
			var id=S[idx][0], type=S[idx][2] ;
			var tag = M[id][2] , level=P[id][1];
			if (type==0) out= '<'+tag+' lv="'+level+'">' +out;
			if (type==1) out= '</'+tag+'>' +out;
			idx++;
		}
		out=tokens[i-1]+out;
	}
	return out;//return text
}
module.exports={calculateLevels:calculateLevels, renderXML:renderXML};

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