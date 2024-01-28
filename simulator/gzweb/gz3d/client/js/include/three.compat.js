/**
 * Created by Sandro Weber (webers@in.tum.de) on 07.08.15.
 */


/**
 * getDescendants() was removed in r68, this reimplements it to ensure compatibility
 * all getDescendants() calls could eventually be replaced with Object3D.traverse(function(node){...});
 */
THREE.Object3D.prototype.getDescendants = function ( array ) {
    if ( array === undefined ) array = [];

    Array.prototype.push.apply( array, this.children );

    for ( var i = 0, l = this.children.length; i < l; i ++ ) {

        this.children[ i ].getDescendants( array );

    }

    return array;
};
