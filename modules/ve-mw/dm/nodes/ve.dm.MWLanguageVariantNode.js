/*!
 * VisualEditor DataModel MWLanguageVariantNode class.
 *
 * @copyright 2011-2017 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * DataModel MediaWiki language variant node, used to represent
 * LanguageConverter markup.
 *
 * @class
 * @abstract
 * @extends ve.dm.LeafNode
 * @mixins ve.dm.FocusableNode
 *
 * @constructor
 */
ve.dm.MWLanguageVariantNode = function VeDmMWLanguageVariantNode() {
	// Parent constructor
	ve.dm.MWLanguageVariantNode.super.apply( this, arguments );

	// Mixin constructors
	ve.dm.FocusableNode.call( this );
};

/* Inheritance */

OO.inheritClass( ve.dm.MWLanguageVariantNode, ve.dm.LeafNode );

OO.mixinClass( ve.dm.MWLanguageVariantNode, ve.dm.FocusableNode );

/* Static members */

ve.dm.MWLanguageVariantNode.static.name = 'mwLanguageVariant';

ve.dm.MWLanguageVariantNode.static.matchTagNames = null;

ve.dm.MWLanguageVariantNode.static.matchRdfaTypes = [ 'mw:LanguageVariant' ];

ve.dm.MWLanguageVariantNode.static.getHashObject = function ( dataElement ) {
	return {
		type: dataElement.type,
		variantInfo: dataElement.attributes.variantInfo
	};
};

/**
 * Node type to use when the contents are inline
 *
 * @static
 * @property {string}
 * @inheritable
 */
ve.dm.MWLanguageVariantNode.static.inlineType = 'mwLanguageVariantInline';

/**
 * Node type to use when the contents are a block
 *
 * @static
 * @property {string}
 * @inheritable
 */
ve.dm.MWLanguageVariantNode.static.blockType = 'mwLanguageVariantBlock';

/**
 * Node type to use when the contents are hidden
 *
 * @static
 * @property {string}
 * @inheritable
 */
ve.dm.MWLanguageVariantNode.static.hiddenType = 'mwLanguageVariantHidden';

/**
 * @inheritdoc
 */
ve.dm.MWLanguageVariantNode.static.toDataElement = function ( domElements, converter ) {
	var dataElement,
		isInline,
		firstElement = domElements[ 0 ],
		dataMwvJSON = firstElement.getAttribute( 'data-mw-variant' ),
		dataMwv = dataMwvJSON ? JSON.parse( dataMwvJSON ) : {};

	dataElement = {
		attributes: {
			variantInfo: dataMwv,
			originalVariantInfo: dataMwvJSON
		}
	};

	if ( firstElement.tagName === 'META' ) {
		dataElement.type = this.hiddenType;
		return dataElement;
	}

	isInline = this.isHybridInline( domElements, converter );
	dataElement.type = isInline ? this.inlineType : this.blockType;
	return dataElement;
};

/**
 * @inheritdoc
 */
ve.dm.MWLanguageVariantNode.static.toDomElements = function ( dataElement, doc, converter ) {
	var variantInfo = dataElement.attributes.variantInfo,
		tagName = this.matchTagNames[ 0 ],
		rdfaType = this.matchRdfaTypes[ 0 ],
		domElement = doc.createElement( tagName ),
		dataMwvJSON = JSON.stringify( variantInfo );

	// Preserve exact equality of this attribute for selser.
	if ( dataElement.attributes.originalVariantInfo ) {
		if ( OO.compare(
			JSON.parse( dataElement.attributes.originalVariantInfo ),
			variantInfo
		) ) {
			dataMwvJSON = dataElement.attributes.originalVariantInfo;
		}
	}

	domElement.setAttribute( 'typeof', rdfaType );
	domElement.setAttribute( 'data-mw-variant', dataMwvJSON );
	if ( converter.isForClipboard() && tagName !== 'META' ) {
		// Fill in contents of span for diff/cut-and-paste/etc.
		this.insertPreviewElements( domElement, variantInfo );
	}
	return [ domElement ];
};

/**
 * Add previews for language variant markup inside their &lt;span> nodes.
 * This ensures that template expansion, cut-and-paste, etc have reasonable
 * renderings.
 *
 * @static
 * @method
 * @param {jQuery} $element Element to process
 * @param {Object|null} opts Preview options
 * @param {boolean} [opts.describeAll=false] Treat all rules as if the
 *   "describe" flag was set. This displays every language and its associated
 *   text, not just the one appropriate for the current user.
 * @return {jQuery} $element
 */
ve.dm.MWLanguageVariantNode.static.processVariants = function ( $element, opts ) {
	var self = this,
		selector = '[typeof="mw:LanguageVariant"]',
		$variantElements = $element.find( selector ).addBack( selector );

	$variantElements.each( function ( _, child ) {
		var dataMwvJSON = child.getAttribute( 'data-mw-variant' );
		if ( dataMwvJSON && child.tagName !== 'META' ) {
			self.insertPreviewElements(
				child, JSON.parse( dataMwvJSON ), opts
			);
		}
	} );
	return $element;
};

/**
 * Insert language variant preview for specified element.
 *
 * @static
 * @method
 * @param {HTMLElement} element Element to insert preview inside of.
 * @param {Object} variantInfo Language variant information object.
 * @param {Object|null} opts Preview options
 * @param {boolean} [opts.describeAll=false] Treat all rules as if the
 *   "describe" flag was set. This displays every language and its associated
 *   text, not just the one appropriate for the current user.
 * @return {HTMLElement} el
 */
ve.dm.MWLanguageVariantNode.static.insertPreviewElements = function ( element, variantInfo, opts ) {
	// Note that `element` can't be a <meta> (or other void tag)
	$( element ).html( this.getPreviewHtml( variantInfo, opts ) );
	// This recurses into the children added by the `html` clause to ensure
	// that nested variants are expanded.
	this.processVariants( $( element ).children(), opts );
	return element;
};

/**
 * Helper method to return an appropriate HTML preview string for a
 * language converter node, based on the language variant information
 * object and the user's currently preferred variant.
 *
 * @static
 * @method
 * @private
 * @param {Object} variantInfo Language variant information object.
 * @param {Object|null} opts Preview options
 * @param {boolean} [opts.describeAll=false] Treat all rules as if the
 *   "describe" flag was set. This displays every language and its associated
 *   text, not just the one appropriate for the current user.
 * @return {string} HTML string
 */
ve.dm.MWLanguageVariantNode.static.getPreviewHtml = function ( variantInfo, opts ) {
	var languageIndex,
		$holder;
	if ( variantInfo.disabled ) {
		return variantInfo.disabled.t;
	} else if ( variantInfo.name ) {
		return ve.init.platform.getLanguageName( variantInfo.name.t.toLowerCase() );
	} else if ( variantInfo.filter ) {
		return variantInfo.filter.t;
	} else if ( variantInfo.describe || ( opts && opts.describeAll ) ) {
		$holder = $( '<body>' );
		if ( variantInfo.bidir && variantInfo.bidir.length ) {
			variantInfo.bidir.forEach( function ( item ) {
				$holder.append(
					ve.init.platform.getLanguageName( item.l.toLowerCase() )
				);
				$holder.append( ':' );
				$holder.append( $.parseHTML( item.t ) );
				$holder.append( ';' );
			} );
		} else if ( variantInfo.unidir && variantInfo.unidir.length ) {
			variantInfo.unidir.forEach( function ( item ) {
				$holder.append( $.parseHTML( item.f ) );
				$holder.append( '⇒' );
				$holder.append(
					ve.init.platform.getLanguageName( item.l.toLowerCase() )
				);
				$holder.append( ':' );
				$holder.append( $.parseHTML( item.t ) );
				$holder.append( ';' );
			} );
		}
		return $holder.html();
	} else {
		if ( variantInfo.bidir && variantInfo.bidir.length ) {
			languageIndex = this.matchLanguage( variantInfo.bidir );
			return variantInfo.bidir[ languageIndex ].t;
		} else if ( variantInfo.unidir && variantInfo.unidir.length ) {
			languageIndex = this.matchLanguage( variantInfo.unidir );
			return variantInfo.unidir[ languageIndex ].t;
		}
	}
	return '';
};

/**
 * @inheritdoc
 */
ve.dm.MWLanguageVariantNode.static.describeChanges = function () {
	// TODO: Provide a more detailed description of markup changes
	return ve.msg( 'visualeditor-changedesc-mwlanguagevariant' );
};

/** */
ve.dm.MWLanguageVariantNode.static.cloneElement = function () {
	// Parent method
	var clone = ve.dm.MWLanguageVariantNode.super.static.cloneElement.apply( this, arguments );
	delete clone.attributes.originalVariantInfo;
	return clone;
};

/**
 * Match the currently-selected language variant against the most appropriate
 * among a provided list of language codes.
 *
 * @static
 * @method
 * @param {Object[]} [items] An array of objects, each of which have a field
 *  named `l` equal to a language code.
 * @return {number} The index in `items` with the most appropriate language
 *  code.
 */
ve.dm.MWLanguageVariantNode.static.matchLanguage = function ( items ) {
	var userVariant = mw.config.get( 'wgUserVariant' ),
		fallbacks = mw.config.get( 'wgVisualEditor' ).pageVariantFallbacks,
		languageCodes =
			( userVariant ? [ userVariant ] : [] ).concat( fallbacks || [] ),
		code,
		i,
		j;
	for ( j = 0; j < languageCodes.length; j++ ) {
		code = languageCodes[ j ].toLowerCase();
		for ( i = 0; i < items.length; i++ ) {
			if (
				items[ i ].l === '*' ||
				items[ i ].l.toLowerCase() === code
			) {
				return i;
			}
		}
	}
	// Bail: just show the first item.
	return 0;
};

/* Methods */

/*
 * Helper function to get the description object for this markup node.
 *
 * @method
 * @return {Object}
 */
ve.dm.MWLanguageVariantNode.prototype.getVariantInfo = function () {
	return this.element.attributes.variantInfo;
};

/**
 * Helper function to discriminate between hidden and shown rules.
 *
 * @method
 * @return {boolean} True if this node represents a conversion rule
 *  with no shown output
 */
ve.dm.MWLanguageVariantNode.prototype.isHidden = function () {
	return false;
};

/**
 * Helper function to discriminate between various types of language
 * converter markup.
 *
 * @method
 * @return {string}
 */
ve.dm.MWLanguageVariantNode.prototype.getRuleType = function () {
	return this.constructor.static.getRuleType( this.getVariantInfo() );
};

/**
 * Helper function to discriminate between various types of language
 * converter markup.
 *
 * @static
 * @method
 * @param {Object} variantInfo Language variant information object.
 * @return {string}
 */
ve.dm.MWLanguageVariantNode.static.getRuleType = function ( variantInfo ) {
	if ( variantInfo.disabled ) { return 'disabled'; }
	if ( variantInfo.filter ) { return 'filter'; }
	if ( variantInfo.name ) { return 'name'; }
	if ( variantInfo.bidir ) { return 'bidir'; }
	if ( variantInfo.unidir ) { return 'unidir'; }
	return 'unknown'; // should never happen
};

/* Concrete subclasses */

/**
 * DataModel MediaWiki language variant block node.
 *
 * @class
 * @extends ve.dm.MWLanguageVariantNode
 *
 * @constructor
 * @param {Object} [element] Reference to element in linear model
 * @param {ve.dm.Node[]} [children]
 */
ve.dm.MWLanguageVariantBlockNode = function VeDmMWLanguageVariantBlockNode() {
	// Parent constructor
	ve.dm.MWLanguageVariantBlockNode.super.apply( this, arguments );
};

OO.inheritClass( ve.dm.MWLanguageVariantBlockNode, ve.dm.MWLanguageVariantNode );

ve.dm.MWLanguageVariantBlockNode.static.matchTagNames = [ 'div' ];

ve.dm.MWLanguageVariantBlockNode.static.name = 'mwLanguageVariantBlock';

/**
 * DataModel MediaWiki language variant inline node.
 *
 * @class
 * @extends ve.dm.MWLanguageVariantNode
 *
 * @constructor
 * @param {Object} [element] Reference to element in linear model
 * @param {ve.dm.Node[]} [children]
 */
ve.dm.MWLanguageVariantInlineNode = function VeDmMWLanguageVariantInlineNode() {
	// Parent constructor
	ve.dm.MWLanguageVariantInlineNode.super.apply( this, arguments );
};

OO.inheritClass( ve.dm.MWLanguageVariantInlineNode, ve.dm.MWLanguageVariantNode );

ve.dm.MWLanguageVariantInlineNode.static.matchTagNames = [ 'span' ];

ve.dm.MWLanguageVariantInlineNode.static.name = 'mwLanguageVariantInline';

ve.dm.MWLanguageVariantInlineNode.static.isContent = true;

/**
 * DataModel MediaWiki language variant hidden node.
 *
 * @class
 * @extends ve.dm.MWLanguageVariantNode
 *
 * @constructor
 * @param {Object} [element] Reference to element in linear model
 * @param {ve.dm.Node[]} [children]
 */
ve.dm.MWLanguageVariantHiddenNode = function VeDmMWLanguageVariantHiddenNode() {
	// Parent constructor
	ve.dm.MWLanguageVariantHiddenNode.super.apply( this, arguments );
};

OO.inheritClass( ve.dm.MWLanguageVariantHiddenNode, ve.dm.MWLanguageVariantNode );

ve.dm.MWLanguageVariantHiddenNode.static.matchTagNames = [ 'meta' ];

ve.dm.MWLanguageVariantHiddenNode.static.name = 'mwLanguageVariantHidden';

ve.dm.MWLanguageVariantHiddenNode.static.isContent = true;

/**
 * @inheritdoc
 */
ve.dm.MWLanguageVariantHiddenNode.prototype.isHidden = function () {
	return true;
};

/* Registration */

ve.dm.modelRegistry.register( ve.dm.MWLanguageVariantBlockNode );
ve.dm.modelRegistry.register( ve.dm.MWLanguageVariantInlineNode );
ve.dm.modelRegistry.register( ve.dm.MWLanguageVariantHiddenNode );
