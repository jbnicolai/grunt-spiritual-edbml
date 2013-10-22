"use strict";

/**
 * Compiling EDBML source to JavaScript.
 * @extends {Compiler}
 * @TODO precompiler to strip out both JS comments and HTML comments.
 */
class FunctionCompiler extends Compiler {
	
	/**
	 * Construction.
	 */
	constructor () {

		/**
		 * Source of compiled function.
		 * @type {String}
		 */
		this.source = null;

		/**
		 * Imported functions and tags.
		 * @type {Array<Import>}
		 */
		this.dependencies = null;

		/**
		 * Mapping script tag attributes.
		 * @type {HashMap<String,String>}
		 */
		this.directives = null;

		/**
		 * Compile sequence.
		 * @type {Array<string>}
		 */
		this.sequence = [ 
			"_validate", 
			"_extract", 
			"_direct", 
			"_declare", 
			"_define", 
			"_compile"
		];

		/**
		 * Script processing intstructions.
		 * @type {Array<Instruction>}
		 */
		this._instructions = null;

		/**
		 * Compiled function arguments list. 
		 * @type {Array<String>}
		 */
		this._params = null;

		/**
		 * Did compilation fail just yet?
		 * @type {boolean}
		 */
		this._failed = false;
	}
		
	/**
	 * Compile source to invocable function.
	 * @param {String} source
	 * @param {Map<String,String} directives
	 * @returns {String}
	 */
	compile ( source, directives ) {
		this.directives = directives || {};
		this.source = source;
		this.dependencies = [];
		this._params = [];
		this._vars = [];
		//var result = null;
		var head = {
			declarations : {}, // Map<String,boolean>
			functiondefs : [] // Array<String>
		};
		this.sequence.forEach ( function ( step ) {
			this.source = this [ step ] ( this.source, head );
		}, this );
		return this._result ( this.source, this._params );
	}


	// PRIVATE ..............................................................................
	

	_result ( body, params ) {
		return new FunctionResult ( body, params );
	}

	/**
	 * Confirm no nested EDBML scripts because it's not parsable in the browser.
	 * @see http://stackoverflow.com/a/6322601
	 * @param {String} script
	 * @param {What?} head
	 * @returns {String}
	 */
	_validate ( script ) {
		if ( FunctionCompiler._NESTEXP.test ( script )) {
			throw "Nested EDBML dysfunction";
		}
		return script;
	}

	/**
	 * Handle directives. Nothing by default.
	 * @see {TagCompiler._direct}
	 * @param  {String} script
	 * @returns {String}
	 */
	_direct ( script ) {
		return script;
	}
	
	/**
	 * Extract and evaluate processing instructions.
	 * @param {String} script
	 * @param {What?} head
	 * @returns {String}
	 */
	_extract ( script, head ) {
		Instruction.from ( script ).forEach ( function ( pi ) {
			this._instruct ( pi );
		}, this );
		return Instruction.clean ( script );
	}

	/**
	 * Evaluate processing instruction.
	 * @param {Instruction} pi
	 */
	_instruct ( pi ) {
		var type = pi.type;
		var atts = pi.atts;
		var name = atts.name;
		switch ( type ) {
			case "param" :
				this._params.push ( name );
				break;
		}
	}

	/**
	 * Remove processing instrutions and translate collected inputs to variable declarations.
	 * @param {String} script
	 * @param {What?} head
	 * @returns {String}
	 */
	_declare ( script, head ) {
		var funcs = [];
		this.dependencies.forEach ( function ( dep ) {
			head.declarations [ dep.name ] = true;
			funcs.push ( dep.name + " = get ( self, '" + dep.tempname () + "' );\n" );
		}, this );
		if ( funcs [ 0 ]) {
			head.functiondefs.push ( 
				"( function functions ( get ) {\n" +
				funcs.join ( "" ) +
				"}( Function.get ));"
			);
		}
		return script;
	}

	/**
	 * Define more stuff in head.
	 * @param {String} script
	 * @param {What?} head
	 * @returns {String}
	 */
	_define ( script, head ) {
		var vars = "", html = "var ";
		each ( head.declarations, function ( name ) {
			vars += ", " + name;
		});
		if ( this._params.indexOf ( "out" ) < 0 ) {
			html += "out = new edb.Out (), ";
		}
		if ( this._params.indexOf ( "att" ) < 0 ) {
			html += "att = new edb.Att () ";
		}
		html += vars + ";\n";
		head.functiondefs.forEach ( function ( def ) {
			html += def +"\n";
		});
		return html + script;
	}
	
	/**
	 * Attempt to parse result as function.
	 * @throws {Error}
	 * @param {String} script
	 * @param @optional (Array<String>} params
	 *
	_convert ( script, params ) {
		var args = "";
		if ( Array.isArray ( params )) {
			args = params.join ( "," );
		}
		new Function ( args, script );
	}
	*/

	/**
	 * Compute full script source (including arguments) for debugging stuff.
	 * @returns {String}
	 */
	_source ( source, params ) {
		var lines = source.split ( "\n" ); lines.pop (); // empty line :/
		var args = params.length ? "( " + params.join ( ", " ) + " )" : "()";
		return "function " + args + " {\n" + lines.join ( "\n" ) + "\n}";
	}

}

// Static ..................................................................................

/**
 * RegExp used to validate no nested scripts (because those are not parsable in the browser). 
 * http://stackoverflow.com/questions/1441463/how-to-get-regex-to-match-multiple-script-tags
 * http://stackoverflow.com/questions/1750567/regex-to-get-attributes-and-body-of-script-tags
 * TODO: stress test for no SRC attribute!
 * @type {RegExp}
 */
FunctionCompiler._NESTEXP = /<script.*type=["']?text\/edbml["']?.*>([\s\S]+?)/g;