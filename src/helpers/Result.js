"use strict";

/**
 * Compile to function.
 */
class Result { 

	/**
	 * @param {String} body
	 * @param {Array<String>} params
	 * @param {Array<Instruction>} instructions
	 */
	constructor ( body, params, instructions ) {
		this.functionstring = this._tofunctionstring ( body, params );
		this.instructionset = instructions;
		this.errormessage = null;
	}

	/**
	 * Compute function source.
	 * @param {String} script
	 * @param @optional (Array<String>} params
	 * @returns {String}
	 */
	_tofunctionstring ( body, params = []) {
		try {
			var js = new Function ( params.join ( "," ), body ).toString ();
			return js.replace ( /^function anonymous/, "function" );
		} catch ( exception ) {
			this.instructionset = null;
			this.errormessage = exception.message;
			return this._tofallbackstring ( 
				body, params, exception.message 
			);
		}
	}

	/**
	 * Fallback for invalid source.
	 * @param {String} script
	 * @param (Array<String>} params
	 * @returns {String}
	 */
	_tofallbackstring ( body, params, exception ) {
		body = this._emergencyformat ( body, params );
		body = new Buffer ( body ).toString ( "base64" );
		body = "gui.BlobLoader.loadScript ( document, atob (  '" + body + "' ));\n";
		body += "return '<p class=\"edberror\">" + exception + "</p>'";
		return this._tofunctionstring ( body );
	}

	/**
	 * Format invalid source for readability.
	 * @param {String} body
	 * @returns {String}
	 */
	_emergencyformat ( body, params ) {
		var result = "",
			tabs = "\t",
			init = null,
			last = null,
			fixt = null,
			hack = null;
		body.split ( "\n" ).forEach (( line ) => {
			line = line.trim ();
			init = line [ 0 ];
			last = line [ line.length - 1 ];
			fixt = line.split ( "//" )[ 0 ].trim ();
			hack = fixt [ fixt.length - 1 ];
			if (( init === "}" || init === "]" ) && tabs !== "" ) {
				tabs = tabs.slice ( 0, -1 );
			}
			result += tabs + line + "\n";
			if ( last === "{" || last === "[" || hack === "{" || hack === "[" ) {
				tabs += "\t";
			}			
		});
		return [ 
			"function dysfunction (" + params + ") {",
			result,
			"}" 
		].join ( "\n" );
	}
}
