/**
 * VisualEditor data model Surface tests.
 *
 * @copyright 2011-2012 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

QUnit.module( 've.dm.Surface' );

ve.dm.SurfaceStub = function ( data ) {
	// Inheritance

	if ( data !== undefined ) {
		this.dm = new ve.dm.Document ( data );
	} else {
		this.dm = new ve.dm.Document ( [{ 'type': 'paragraph' }, 'h', 'i', { 'type': '/paragraph' }] );
	}
	ve.dm.Surface.call( this, this.dm );
};

// Inheritance

ve.extendClass( ve.dm.SurfaceStub, ve.dm.Surface );

// Tests

QUnit.test( 'getDocument', 1, function ( assert ) {
	var surface = new ve.dm.SurfaceStub();
	assert.strictEqual( surface.getDocument(), surface.documentModel );
} );

QUnit.test( 'getSelection', 1, function ( assert ) {
	var surface = new ve.dm.SurfaceStub();
	assert.strictEqual( surface.getSelection(), surface.selection );
} );

QUnit.test( 'change', 3, function ( assert ) {
	var surface = new ve.dm.SurfaceStub(),
		tx = new ve.dm.Transaction(),
		events = {
			'transact': 0,
			'select': 0,
			'change': 0
		};

	surface.on( 'transact', function () {
		events.transact++;
	} );
	surface.on( 'select', function () {
		events.select++;
	} );
	surface.on( 'change', function () {
		events.change++;
	} );
	surface.change( tx );
	assert.deepEqual( events, { 'transact': 1, 'select': 0, 'change': 1 } );
	surface.change( null, new ve.Range( 1, 1 ) );
	assert.deepEqual( events, { 'transact': 1, 'select': 1, 'change': 2 } );
	surface.change( tx, new ve.Range( 2, 2 ) );
	assert.deepEqual( events, { 'transact': 2, 'select': 2, 'change': 3 } );
} );

QUnit.test( 'annotate', 1, function ( assert ) {
	var i,
		surface,
		cases = [
		{
			'msg': 'Set Bold',
			'data': [
				'b', 'o', 'l', 'd'
			],
			'expected':
			[
				[
					'b',
						{
							"{\"type\":\"textStyle/bold\"}": {
								"type": "textStyle/bold"
							}
						}
				],
				[
					'o',
						{
							"{\"type\":\"textStyle/bold\"}": {
								"type": "textStyle/bold"
							}
						}
				],
				[
					'l',
						{
							"{\"type\":\"textStyle/bold\"}": {
								"type": "textStyle/bold"
							}
						}
				],
				[
					'd',
						{
							"{\"type\":\"textStyle/bold\"}": {
								"type": "textStyle/bold"
							}
						}
				]
			],
			'annotate': {
				'method': 'set',
				'annotation': { 'type': 'textStyle/bold' }
			}
		}
	];

	QUnit.expect( cases.length );
	for ( i = 0; i < cases.length; i++ ) {
		surface = new ve.dm.SurfaceStub( cases[i].data );
		surface.change( null, new ve.Range( 0, surface.getDocument().getData().length ) );
		surface.annotate( cases[i].annotate.method, cases[i].annotate.annotation );
		assert.deepEqual( surface.getDocument().getData(), cases[i].expected, cases[i].msg );
	}
} );
