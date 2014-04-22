var tibetan =function(s) {
	//continuous tsek grouped into same token
	//shad and space grouped into same token
	var offset=0;
	var tokens=[],offsets=[];
	s=s.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
	arr=s.split('\n');

	for (var i=0;i<arr.length;i++) {
		var last=0;
		str=arr[i];
		str.replace(/[།་ ]+/g,function(m,m1){
			tokens.push(str.substring(last,m1)+m);
			offsets.push(offset+last);
			last=m1+m.length;
		});
		if (i===arr.length-1) break;
		tokens.push('\n');
		offsets.push(offset+last);
		offset+=str.length+1;
	}

	return {tokens:tokens,offsets:offsets};
};
var simple=function(s) {
	var isCJK =function(c) {return ((c>=0x3000 && c<=0x9FFF) ||
	 (c>=0xD800 && c<0xDFFF) || (c>=0xFF00)) ;};
	var token='';
	var res=[], offsets=[] , skips=[];
	var i=0; 
	var skiptokencount=0;
	addtoken=function(skip) {
		if (!token) return;
		res.push(token);
		offsets.push(i);
		toskip=skip||(token.charAt(0)=='<' ||
		            token.charCodeAt(0)<=0x20); 
		skips.push(toskip);
		if (toskip) skiptokencount++;
		token='';
	};
	while (i<s.length) {
		var c=s.charAt(i);
		var code=s.charCodeAt(i);
		if (isCJK(code)) {
			addtoken();
			token=c;
			if (code>=0xD800 && code<0xDFFF) {
				token+=s.charAt(i+1);i++;
			}
			addtoken();
		} else {
			if (c<'0' || c=='&' || c=='<' || c=='?' ||
			 c=='|' || c=='~' || c=='`' || c==';'  ||
			 c=='>' || c==':' || c=='{' || c=='}' ||
			 c=='=' || c=='@' || c=='[' || c==']' ||
			 code==0xf0b || code==0xf0d || // tibetan space
			 (code>=0x2000 && code<=0x206f)) {
				addtoken();
				if (c=='&' || c=='<') {
					var endchar='>';
					if (c==='&') endchar=';';
					while (i<s.length && s.charAt(i)!=endchar) {
						token+=s.charAt(i);
						i++;
					}
					token+=endchar;
					addtoken();
				} else {
					token=c;
					addtoken(true);
				}
				token='';
			} else {
				token+=s.charAt(i);
			}
		}
		i++;
	}
	if (token.trim()) addtoken();
	return {tokens:res, offsets:offsets,skips:skips,skiptokencount:skiptokencount};
};

module.exports={simple:simple,tibetan:tibetan};