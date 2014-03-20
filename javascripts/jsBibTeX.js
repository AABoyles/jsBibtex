/**
 * Javascript BibTex Parser v0.1.3
 * Copyright (c) 2013-4, Tony Boyles <AABoyles@gmail.com>
 *
 * License:
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 *     along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
var php = {};

php.array_key_exists = function(key, search) {
	if (!search || (search.constructor !== Array && search.constructor !== Object)) {
		return false;
	}

	return key in search;
};

php.array_keys = function(input, search_value, strict) {
	var tmp_arr = new Array(), strict = !!strict, include = true, cnt = 0;

	for (key in input ) {
		include = true;
		if (search_value != undefined) {
			if (strict && input[key] !== search_value) {
				include = false;
			} else if (input[key] != search_value) {
				include = false;
			}
		}

		if (include) {
			tmp_arr[cnt] = key;
			cnt++;
		}
	}

	return tmp_arr;
};

php.in_array = function(needle, haystack) {
	for (var key in haystack) {
		if (haystack[key] == needle) {
			return true;
		}
	}
	return false;
};

php.explode = function(delimiter, string, limit) {
	var emptyArray = {
		0 : ''
	};

	// third argument is not required
	if (arguments.length < 2 || typeof arguments[0] == 'undefined' || typeof arguments[1] == 'undefined') {
		return null;
	}

	if (delimiter === '' || delimiter === false || delimiter === null) {
		return false;
	}

	if ( typeof delimiter == 'function' || typeof delimiter == 'object' || typeof string == 'function' || typeof string == 'object') {
		return emptyArray;
	}

	if (delimiter === true) {
		delimiter = '1';
	}

	if (!limit) {
		return string.toString().split(delimiter.toString());
	} else {
		// support for limit argument
		var splitted = string.toString().split(delimiter.toString());
		var partA = splitted.splice(0, limit - 1);
		var partB = splitted.join(delimiter.toString());
		partA.push(partB);
		return partA;
	}
};

php.str_replace = function(search, replace, subject) {
	var f = search, r = replace, s = subject;
	var ra = r instanceof Array, sa = s instanceof Array, f = [].concat(f), r = [].concat(r), i = ( s = [].concat(s)).length;

	while ( j = 0, i--) {
		while (s[i] = s[i].split(f[j]).join( ra ? r[j] || "" : r[0]), ++j in f) {};
	};

	return sa ? s : s[0];
};

php.strrpos = function(haystack, needle, offset) {
	var i = haystack.lastIndexOf(needle, offset);
	return i >= 0 ? i : false;
};

php.substr = function(f_string, f_start, f_length) {
	if (f_start < 0) {
		f_start += f_string.length;
	}

	if (f_length == undefined) {
		f_length = f_string.length;
	} else if (f_length < 0) {
		f_length += f_string.length;
	} else {
		f_length += f_start;
	}

	if (f_length < f_start) {
		f_length = f_start;
	}

	return f_string.substring(f_start, f_length);
};

php.array_unique = function(array) {
	var p, i, j, tmp_arr = array;
	for ( i = tmp_arr.length; i; ) {
		for ( p = --i; p > 0; ) {
			if (tmp_arr[i] === tmp_arr[--p]) {
				for ( j = p; --p && tmp_arr[i] === tmp_arr[p]; );
				i -= tmp_arr.splice(p + 1, j - p).length;
			}
		}
	}
	return tmp_arr;
};

function BibTeX(options) {
	if ( typeof options == 'undefined'){
		options = {};
	}
	this._delimiters = {
		'"' : '"',
		'{' : '}'
	};
	this.data = [];
	this.content = '';
	//this._stripDelimiter = stripDel;
	//this._validate       = val;
	this.warnings = [];
	this._options = {
		'stripDelimiter' : true,
		'validate' : true,
		'unwrap' : false,
		'wordWrapWidth' : false,
		'wordWrapBreak' : "\n",
		'wordWrapCut' : 0,
		'removeCurlyBraces' : false,
		'extractAuthors' : true
	};
	for (option in options) {
		test = this.setOption(option, options[option]);
		if (this.isError(test)) {
			//Currently nothing is done here, but it could for example raise an warning
		}
	}
	this.rtfstring = 'AUTHORS, "{\b TITLE}", {\i JOURNAL}, YEAR';
	this.htmlstring = 'AUTHORS, "<strong>TITLE</strong>", <em>JOURNAL</em>, YEAR<br />';
	this.allowedEntryTypes = ['article', 'book', 'booklet', 'confernce', 'inbook', 'incollection', 'inproceedings', 'manual', 'masterthesis', 'misc', 'phdthesis', 'proceedings', 'techreport', 'unpublished'];
	this.authorstring = 'VON LAST, JR, FIRST';
}

BibTeX.prototype = {

	setOption : function(option, value) {
		ret = true;
		if (php.array_key_exists(option, this._options)) {
			this._options[option] = value;
		} else {
			ret = this.raiseError('Unknown option ' + option);
		}
		return ret;
	},

	parse : function(input) {
		if(input){
			this.content = input;
		}
		this.warnings = [];
		this.data = [];
		var valid = true;
		var open = 0;
		var entry = false;
		var charv = '';
		var lastchar = '';
		var buffer = '';
		for (var i = 0; i < this.content.length; i++) {
			charv =php.substr(this.content, i, 1);
			if ((0 != open) && ('@' == charv)) {
				if (!this._checkAt(buffer)) {
					this._generateWarning('WARNING_MISSING_END_BRACE', '', buffer);
					//To correct the data we need to insert a closing brace
					charv = '}';
					i--;
				}
			}
			if ((0 == open) && ('@' == charv)) {//The beginning of an entry
				entry = true;
			} else if (entry && ('{' == charv) && ('\\' != lastchar)) {//Inside an entry and non quoted brace is opening
				open++;
			} else if (entry && ('}' == charv) && ('\\' != lastchar)) {//Inside an entry and non quoted brace is closing
				open--;
				if (open < 0) {//More are closed than opened
					valid = false;
				}
				if (0 == open) {//End of entry
					entry = false;
					var entrydata = this._parseEntry(buffer);
					if (!entrydata) {
						/**
						 * This is not yet used+
						 * We are here if the Entry is either not correct or not supported+
						 * But this should already generate a warning+
						 * Therefore it should not be necessary to do anything here
						 */
					} else {
						this.data[this.data.length] = entrydata;
					}
					buffer = '';
				}
			}
			if (entry) {//Inside entry
				buffer += charv;
			}
			lastchar = charv;
		}
		//If open is one it may be possible that the last ending brace is missing
		if (1 == open) {
			entrydata = this._parseEntry(buffer);
			if (!entrydata) {
				valid = false;
			} else {
				this.data[this.data.length] = entrydata;
				buffer = '';
				open = 0;
			}
		}
		//At this point the open should be zero
		if (0 != open) {
			valid = false;
		}
		//Are there Multiple entries with the same cite?
		if (this._options['validate']) {
			cites = [];
			for (var i = 0; i < this.data.length; i++) {
				cites[cites.length] = this.data[i]['cite'];
			}
			unique = php.array_unique(cites);
			if (cites.length != unique.length) {//Some values have not been unique!
				notuniques = [];
				for (var i = 0; i < cites.length; i++) {
					if ('' == unique[i]) {
						notuniques[notuniques.length] = cites[i];
					}
				}
				this._generateWarning('WARNING_MULTIPLE_ENTRIES', notuniques.join(","));
			}
		}
		if (valid) {
			this.content = '';
			return this.data;
		} else {
			return this.raiseError('Unbalanced parenthesis');
		}
	},

	'_parseEntry' : function(entry) {
		var entrycopy = '';
		if (this._options['validate']) {
			entrycopy = entry;
			//We need a copy for printing the warnings
		}
		var ret = {};
		if ('@string' ==php.substr(entry, 0, 7).toLowerCase()) {
			//String are not yet supported!
			if (this._options['validate']) {
				this._generateWarning('STRING_ENTRY_NOT_YET_SUPPORTED', '', entry + '}');
			}
		} else if ('@preamble' ==php.substr(entry, 0, 9).toLowerCase()) {
			//Preamble not yet supported!
			if (this._options['validate']) {
				this._generateWarning('PREAMBLE_ENTRY_NOT_YET_SUPPORTED', '', entry + '}');
			}
		} else {
			//Parsing all fields
			while (php.strrpos(entry, '=') !== false) {
				position = php.strrpos(entry, '=');
				//Checking that the equal sign is not quoted or is not inside a equation (For example in an abstract)
				proceed = true;
				if (php.substr(entry, position - 1, 1) == '\\') {
					proceed = false;
				}
				if (proceed) {
					proceed = this._checkEqualSign(entry, position);
				}
				while (!proceed) {
					substring = php.substr(entry, 0, position);
					position = php.strrpos(substring, '=');
					proceed = true;
					if (php.substr(entry, position - 1, 1) == '\\') {
						proceed = false;
					}
					if (proceed) {
						proceed = this._checkEqualSign(entry, position);
					}
				}

				value = php.substr(entry, position + 1).trim();
				entry = php.substr(entry, 0, position);

				if (',' == php.substr(value, value.length - 1, 1)) {
					value = php.substr(value, 0, -1);
				}
				if (this._options['validate']) {
					this._validateValue(value, entrycopy);
				}
				if (this._options['stripDelimiter']) {
					value = this._stripDelimiter(value);
				}
				if (this._options['unwrap']) {
					value = this._unwrap(value);
				}
				if (this._options['removeCurlyBraces']) {
					value = this._removeCurlyBraces(value);
				}
				position = php.strrpos(entry, ',');
				field = php.substr(entry, position + 1).trim().toLowerCase();
				ret[field] = value;
				entry = php.substr(entry, 0, position);
			}
			//Parsing cite and entry type
			var arr = php.explode('{', entry);
			ret['cite'] = arr[1].trim();
			ret['entryType'] = arr[0].trim().toLowerCase();
			if ('@' == ret['entryType'].substring(0, 1)) {
				ret['entryType'] = php.substr(ret['entryType'], 1);
			}
			if (this._options['validate']) {
				if (!this._checkAllowedEntryType(ret['entryType'])) {
					this._generateWarning('WARNING_NOT_ALLOWED_ENTRY_TYPE', ret['entryType'], entry + '}');
				}
			}
			//Handling the authors
			if (php.in_array('author', php.array_keys(ret)) && this._options['extractAuthors']) {
				ret['author'] = this._extractAuthors(ret['author']);
			}
		}
		return ret;
	},

	'_checkEqualSign' : function(entry, position) {
		var ret = true;
		//This is getting tricky
		//We check the string backwards until the position and count the closing an opening braces
		//If we reach the position the amount of opening and closing braces should be equal
		var open = 0;
		for (var i = entry.length - 1; i >= position; i--) {
			precedingchar = php.substr(entry, i - 1, 1);
			charv = php.substr(entry, i, 1);
			if (('{' == charv) && ('\\' != precedingchar)) {
				open++;
			}
			if (('}' == charv) && ('\\' != precedingchar)) {
				open--;
			}
		}
		if (0 != open) {
			ret = false;
		}
		//There is still the posibility that the entry is delimited by double quotes+
		//Then it is possible that the braces are equal even if the '=' is in an equation+
		if (ret) {
			entrycopy = entry.trim();
			lastchar = php.substr(entrycopy, entrycopy.length - 1, 1);
			if (',' == lastchar) {
				lastchar = php.substr(entrycopy, entrycopy.length - 2, 1);
			}
			if ('"' == lastchar) {
				//The return value is set to false
				//If we find the closing " before the '=' it is set to true again+
				//Remember we begin to search the entry backwards so the " has to show up twice - ending and beginning delimiter
				ret = false;
				found = 0;
				for (var i = entry.length; i >= position; i--) {
					precedingchar = php.substr(entry, i - 1, 1);
					charv = php.substr(entry, i, 1);
					if (('"' == charv) && ('\\' != precedingchar)) {
						found++;
					}
					if (2 == found) {
						ret = true;
						break;
					}
				}
			}
		}
		return ret;
	},

	'_checkAllowedEntryType' : function(entry) {
		return php.in_array(entry, this.allowedEntryTypes);
	},

	'_checkAt' : function(entry) {
		var ret = false;
		var opening = php.array_keys(this._delimiters);
		var closing = array_values(this._delimiters);
		//Getting the value (at is only allowd in values)
		if (php.strrpos(entry, '=') !== false) {
			position = php.strrpos(entry, '=');
			proceed = true;
			if (php.substr(entry, position - 1, 1) == '\\') {
				proceed = false;
			}
			while (!proceed) {
				substring = php.substr(entry, 0, position);
				position = php.strrpos(substring, '=');
				proceed = true;
				if (php.substr(entry, position - 1, 1) == '\\') {
					proceed = false;
				}
			}
			value = php.substr(entry, position + 1).trim();
			open = 0;
			charv = '';
			lastchar = '';
			for (var i = 0; i < value.length; i++) {
				charv = php.substr(this.content, i, 1);
				if (php.in_array(charv, opening) && ('\\' != lastchar)) {
					open++;
				} else if (php.in_array(charv, closing) && ('\\' != lastchar)) {
					open--;
				}
				lastchar = charv;
			}
			//if open is grater zero were are inside an entry
			if (open > 0) {
				ret = true;
			}
		}
		return ret;
	},

	'_stripDelimiter' : function(entry) {
		var beginningdels = php.array_keys(this._delimiters);
		var firstchar = php.substr(entry, 0, 1);
		var lastchar = php.substr(entry, -1, 1);
		while (php.in_array(firstchar, beginningdels)) {//The first character is an opening delimiter
			if (lastchar == this._delimiters[firstchar]) {//Matches to closing Delimiter
				entry = php.substr(entry, 1, -1);
			} else {
				break;
			}
			firstchar = php.substr(entry, 0, 1);
			lastchar = php.substr(entry, -1, 1);
		}
		return entry;
	},

	'_unwrap' : function(entry) {
		return entry.replace(/\s+/, ' ').trim();
	},

	'_wordwrap' : function(entry) {
		if (('' != entry) && (typeof entry == 'string')) {
			var m = this._options['wordWrapWidth'], b = this._options['wordWrapBreak'], c = this._options['wordWrapCut'];
			var i, j, l, s, r;
			if (m < 1) { return entry; }
			for ( i = -1, l = ( r = entry.split("\n")).length; ++i < l; r[i] += s) {
				for ( s = r[i], r[i] = ""; s.length > m; r[i] += s.slice(0, j) + (( s = s.slice(j)).length ? b : "")) {
					j = c == 2 || (j = s.slice(0, m + 1).match(/\S*(\s)?$/))[1] ? m : j.input.length - j[0].length || c == 1 && m || j.input.length + ( j = s.slice(m).match(/^\S*/)).input.length;
				}
			}
			entry = r.join("\n");
		}
		return entry;
	},

	'_extractAuthors' : function(entry) {
		entry = this._unwrap(entry);
		var authorarray = [];
		authorarray = php.explode(' and ', entry);
		for (var i = 0; i < authorarray.length; i++) {
			var author = authorarray[i].trim();
			/*The first version of how an author could be written (First von Last)
			 has no commas in it*/
			var first = '';
			var von = '';
			var last = '';
			var jr = '';
			if (author.indexOf(',') === -1) {
				var tmparray = [];
				//tmparray = php.explode(' ', author);
				tmparray = php.explode(' |~', author);
				var size = tmparray.length;
				if (1 == size) {//There is only a last
					last = tmparray[0];
				} else if (2 == size) {//There is a first and a last
					first = tmparray[0];
					last = tmparray[1];
				} else {
					var invon = false;
					var inlast = false;
					for (var j = 0; j < (size - 1); j++) {
						if (inlast) {
							last += ' ' + tmparray[j];
						} else if (invon) {
							casev = this._determineCase(tmparray[j]);
							if (this.isError(casev)) {
								// IGNORE?
							} else if ((0 == casev) || (-1 == casev)) {//Change from von to last
								//You only change when there is no more lower case there
								islast = true;
								for (var k = (j + 1); k < (size - 1); k++) {
									futurecase = this._determineCase(tmparray[k]);
									if (this.isError(casev)) {
										// IGNORE?
									} else if (0 == futurecase) {
										islast = false;
									}
								}
								if (islast) {
									inlast = true;
									if (-1 == casev) {//Caseless belongs to the last
										last += ' ' + tmparray[j];
									} else {
										von += ' ' + tmparray[j];
									}
								} else {
									von += ' ' + tmparray[j];
								}
							} else {
								von += ' ' + tmparray[j];
							}
						} else {
							var casev = this._determineCase(tmparray[j]);
							if (this.isError(casev)) {
								// IGNORE?
							} else if (0 == casev) {//Change from first to von
								invon = true;
								von += ' ' + tmparray[j];
							} else {
								first += ' ' + tmparray[j];
							}
						}
					}
					//The last entry is always the last!
					last += ' ' + tmparray[size - 1];
				}
			} else {//Version 2 and 3
				var tmparray = [];
				tmparray = php.explode(',', author);
				//The first entry must contain von and last
				vonlastarray = [];
				vonlastarray = php.explode(' ', tmparray[0]);
				size = vonlastarray.length;
				if (1 == size) {//Only one entry.got to be the last
					last = vonlastarray[0];
				} else {
					inlast = false;
					for (var j = 0; j < (size - 1); j++) {
						if (inlast) {
							last += ' ' + vonlastarray[j];
						} else {
							if (0 != (this._determineCase(vonlastarray[j]))) {//Change from von to last
								islast = true;
								for (var k = (j + 1); k < (size - 1); k++) {
									this._determineCase(vonlastarray[k]);
									casev = this._determineCase(vonlastarray[k]);
									if (this.isError(casev)) {
										// IGNORE?
									} else if (0 == casev) {
										islast = false;
									}
								}
								if (islast) {
									inlast = true;
									last += ' ' + vonlastarray[j];
								} else {
									von += ' ' + vonlastarray[j];
								}
							} else {
								von += ' ' + vonlastarray[j];
							}
						}
					}
					last += ' ' + vonlastarray[size - 1];
				}
				//Now we check if it is version three (three entries in the array (two commas)
				if (3 == tmparray.length) {
					jr = tmparray[1];
				}
				//Everything in the last entry is first
				first = tmparray[tmparray.length - 1];
			}
			authorarray[i] = {
				'first' : first.trim(),
				'von' : von.trim(),
				'last' : last.trim(),
				'jr' : jr.trim()
			};
		}
		return authorarray;
	},

	'_determineCase' : function(word) {
		var ret = -1;
		var trimmedword = word.trim();
		/*We need this variable+ Without the next of would not work
		 (trim changes the variable automatically to a string!)*/
		if (typeof word == "string" && (trimmedword.length > 0)) {
			var i = 0;
			var found = false;
			var openbrace = 0;
			while (!found && (i <= word.length)) {
				var letter = php.substr(trimmedword, i, 1);
				var ordv = letter.charCodeAt(0);
				if (ordv == 123) {//Open brace
					openbrace++;
				}
				if (ordv == 125) {//Closing brace
					openbrace--;
				}
				if ((ordv >= 65) && (ordv <= 90) && (0 == openbrace)) {//The first character is uppercase
					ret = 1;
					found = true;
				} else if ((ordv >= 97) && (ordv <= 122) && (0 == openbrace)) {//The first character is lowercase
					ret = 0;
					found = true;
				} else {//Not yet found
					i++;
				}
			}
		} else {
			ret = this.raiseError('Could not determine case on word: ' + word);
		}
		return ret;
	},

	'isError' : function(obj) {
		return ( typeof (obj) == 'Object' && obj.isError == 1 );

	},

	'_validateValue' : function(entry, wholeentry) {
		//There is no @ allowed if the entry is enclosed by braces
		if (entry.match(/^{.*@.*}/)) {
			this._generateWarning('WARNING_AT_IN_BRACES', entry, wholeentry);
		}
		//No escaped " allowed if the entry is enclosed by double quotes
		if (entry.match(/^\".*\\".*\"/)) {
			this._generateWarning('WARNING_ESCAPED_DOUBLE_QUOTE_INSIDE_DOUBLE_QUOTES', entry, wholeentry);
		}
		//Amount of Braces is not correct
		var open = 0;
		var lastchar = '';
		var charv = '';
		for (var i = 0; i < entry.length; i++) {
			charv = php.substr(entry, i, 1);
			if (('{' == charv) && ('\\' != lastchar)) {
				open++;
			}
			if (('}' == charv) && ('\\' != lastchar)) {
				open--;
			}
			lastchar = charv;
		}
		if (0 != open) {
			this._generateWarning('WARNING_UNBALANCED_AMOUNT_OF_BRACES', entry, wholeentry);
		}
	},

	'_removeCurlyBraces' : function(value) {
		//First we save the delimiters
		var beginningdels = php.array_keys(this._delimiters);
		var firstchar = php.substr(value, 0, 1);
		var lastchar = php.substr(value, -1, 1);
		var begin = '';
		var end = '';
		while (php.in_array(firstchar, beginningdels)) {//The first character is an opening delimiter
			if (lastchar == this._delimiters[firstchar]) {//Matches to closing Delimiter
				begin += firstchar;
				end += lastchar;
				value = php.substr(value, 1, -1);
			} else {
				break;
			}
			firstchar = php.substr(value, 0, 1);
			lastchar = php.substr(value, -1, 1);
		}
		//Now we get rid of the curly braces
		var pattern = '/([^\\\\])\{(+*?[^\\\\])\}/';
		var replacement = '12';
		value = value.replace(/([^\\\\])\{(.*?[^\\\\])\}/, replacement);
		//Reattach delimiters
		value = begin + value + end;
		return value;
	},

	'_generateWarning' : function(type, entry, wholeentry) {
		var warning = {};
		if ( typeof wholeentry == 'undefined')
			wholeentry = '';
		warning['warning'] = type;
		warning['entry'] = entry;
		warning['wholeentry'] = wholeentry;
		this.warnings[this.warnings.length] = warning;
	},

	'clearWarnings' : function() {
		this.warnings = [];
	},

	'hasWarning' : function() {
		return this.warnings.length > 0;
	},

	'amount' : function() {
		return this.data.length;
	},

	'_formatAuthor' : function(array) {
		if (!php.array_key_exists('von', array)) {
			array['von'] = '';
		} else {
			array['von'] = array['von'].trim();
		}
		if (!php.array_key_exists('last', array)) {
			array['last'] = '';
		} else {
			array['last'] = array['last'].trim();
		}
		if (!php.array_key_exists('jr', array)) {
			array['jr'] = '';
		} else {
			array['jr'] = array['jr'].trim();
		}
		if (!php.array_key_exists('first', array)) {
			array['first'] = '';
		} else {
			array['first'] = array['first'].trim();
		}
		ret = this.authorstring;
		ret = php.str_replace("VON", array['von'], ret);
		ret = php.str_replace("LAST", array['last'], ret);
		ret = php.str_replace("JR", array['jr'], ret);
		ret = php.str_replace("FIRST", array['first'], ret);
		return ret.trim();
	},

	'bibTex' : function() {
		var bibtex = '';
		for (var i = 0; i < this.data.length; i++) {
			var entry = this.data[i];
			//Intro
			bibtex += '@' + entry['entryType'].toLowerCase() + ' { ' + entry['cite'] + ",\n";
			//Other fields except author
			for (key in entry) {
				var val = entry[key];
				if (this._options['wordWrapWidth'] > 0) {
					val = this._wordWrap(val);
				}
				if (!php.in_array(key, ['cite', 'entryType', 'author'])) {
					bibtex += "\t" + key + ' = {' + val + "},\n";
				}
			}
			//Author
			if (php.array_key_exists('author', entry)) {
				if (this._options['extractAuthors']) {
					tmparray = [];
					//In this array the authors are saved and the joind with an and
					for (j in entry['author']) {
						var authorentry = entry['author'][j];
						tmparray[tmparray.length] = this._formatAuthor(authorentry);
					}
					author = tmparray.join(' and ');
				} else {
					author = entry['author'];
				}
			} else {
				author = '';
			}
			bibtex += "\tauthor = {" + author + "}\n";
			bibtex += "}\n\n";
		}
		return bibtex;
	},

	'addEntry' : function(newentry) {
		this.data[this.data.length] = newentry;
	},

	'getStatistic' : function() {
		var ret = [];
		for (var i = 0; i < this.data.length; i++) {
			var entry = this.data[i];
			if (php.array_key_exists(entry['entryType'], ret)) {
				ret[entry['entryType']]++;
			} else {
				ret[entry['entryType']] = 1;
			}
		}
		return ret;
	},

	'rtf' : function() {
		var ret = "{\\rtf\n";
		for (var i = 0; i < this.data.length; i++) {
			var entry = this.data[i];
			line = this.rtfstring;
			title = '';
			journal = '';
			year = '';
			authors = '';
			if (php.array_key_exists('title', entry)) {
				title = this._unwrap(entry['title']);
			}
			if (php.array_key_exists('journal', entry)) {
				journal = this._unwrap(entry['journal']);
			}
			if (php.array_key_exists('year', entry)) {
				year = this._unwrap(entry['year']);
			}
			if (php.array_key_exists('author', entry)) {
				if (this._options['extractAuthors']) {
					tmparray = [];
					//In this array the authors are saved and the joind with an and
					for (var j in entry['author']) {
						var authorentry = entry['author'][j];
						tmparray[tmparray.length] = this._formatAuthor(authorentry);
					}
					authors = tmparray.join(', ');
				} else {
					authors = entry['author'];
				}
			}
			if (('' != title) || ('' != journal) || ('' != year) || ('' != authors)) {
				line = php.str_replace("TITLE", title, line);
				line = php.str_replace("JOURNAL", journal, line);
				line = php.str_replace("YEAR", year, line);
				line = php.str_replace("AUTHORS", authors, line);
				line += "\n\\par\n";
				ret += line;
			} else {
				this._generateWarning('WARNING_LINE_WAS_NOT_CONVERTED', '', JSON.stringify(entry));
			}
		}
		ret += '}';
		return ret;
	},

	'html' : function(min, max) {
		if ( typeof min == 'undefined')
			min = 0;
		if ( typeof max == 'undefined')
			max = this.data.length;
		var ret = "<p>\n";
		for (var i = min; i < max; i++) {
			var entry = this.data[i];
			var line = this.htmlstring;
			var title = '';
			var journal = '';
			var year = '';
			var authors = '';
			if (php.array_key_exists('title', entry)) {
				title = this._unwrap(entry['title']);
			}
			if (php.array_key_exists('journal', entry)) {
				journal = this._unwrap(entry['journal']);
			}
			if (php.array_key_exists('year', entry)) {
				year = this._unwrap(entry['year']);
			}
			if (php.array_key_exists('author', entry)) {
				if (this._options['extractAuthors']) {
					tmparray = [];
					//In this array the authors are saved and the joind with an and
					for (j in entry['author'] ) {
						var authorentry = entry['author'][j];
						tmparray[tmparray.length] = this._formatAuthor(authorentry);
					}
					authors = tmparray.join(', ');
				} else {
					authors = entry['author'];
				}
			}

			if (('' != title) || ('' != journal) || ('' != year) || ('' != authors)) {
				line = php.str_replace("TITLE", title, line);
				line = php.str_replace("JOURNAL", journal, line);
				line = php.str_replace("YEAR", year, line);
				line = php.str_replace("AUTHORS", authors, line);
				line += "\n";
				ret += line;
			} else {
				this._generateWarning('WARNING_LINE_WAS_NOT_CONVERTED', '', JSON.stringify(entry));
			}
		}
		ret += "</p>\n";
		return ret;
	}
};

jsBibTeX = new BibTeX();
