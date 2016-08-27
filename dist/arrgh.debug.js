/**
 * @namespace arrgh
 */
 var arrgh = (function () {
 	"use strict";

    // Helper functions.
    var inherit = function (inheritor, inherited) {
    	var Temp = function () { };
    	Temp.prototype = inherited.prototype;
    	inheritor.prototype = new Temp();
    	inheritor.prototype.constructor = inheritor;
    };

    var isNull = function (obj) {
    	return obj === undefined || obj === null;
    };

    var isNotNull = function (obj) {
    	return !isNull(obj);
    };

    var alwaysTrue = function () {
    	return true;
    };

    var identity = function (x) {
    	return x;
    };

    var isArray = function (o) {
    	return Object.prototype.toString.call(o) === "[object Array]";
    };

    var eqComparer = function (x, y) {
    	return x === y;
    };

    var qsort = function (enumerable, comparer) {
    	if (enumerable.count() < 2) {
    		return enumerable;
    	}

    	var head = enumerable.first();
    	var smaller = enumerable.where(function (item, index) {
    		if (index === 0) {
    			return false;
    		}
    		if (comparer) {
    			return comparer(item, head) <= 0;
    		} else {
    			return item <= head;
    		}
    	});
    	var bigger = enumerable.where(function (item, index) {
    		if (index === 0) {
    			return false;
    		}
    		if (comparer) {
    			return comparer(item, head) > 0;
    		} else {
    			return item > head;
    		}
    	});
    	smaller = qsort(smaller, comparer).toArray();
    	bigger = qsort(bigger, comparer).toArray();
    	head = [head];
    	var arr = smaller.concat(head, bigger);
    	return new Enumerable(arr);
    };

    // Iterators.
    var ArrayIterator = function (arr) {
    	var len = arr.length;
    	var index = -1;
    	this.getIndex = function () {
    		return index;
    	};
    	this.moveNext = function () {
    		if (arr.length !== len) {
    			throw "Collection was modified, enumeration operation may not execute.";
    		}
    		index += 1;
    		return index < len;
    	};
    	this.current = function () {
    		return arr[index];
    	};
    };

    var WhereIterator = function (source, predicate) {
    	predicate = predicate || alwaysTrue;

    	var index = -1;
    	var iterator = source.getIterator();
    	var moveNext = function () {
    		if (iterator.moveNext()) {
    			if (predicate(iterator.current(), iterator.getIndex())) {
    				index += 1;
    				return true;
    			} else {
    				return moveNext();
    			}
    		} else {
    			return false;
    		}
    	};

    	this.getIndex = function () {
    		return index;
    	};
    	this.moveNext = moveNext;
    	this.current = iterator.current;
    };

    var SelectIterator = function (source, selector) {
    	selector = selector || identity;

    	var iterator = source.getIterator();
    	this.getIndex = iterator.getIndex;
    	this.moveNext = iterator.moveNext;
    	this.current = function () {
    		return selector(iterator.current(), iterator.getIndex());
    	};
    };

    /**
	 * Represents the base class for any collection.
	 * @class
	 * @memberof arrgh
	 * @constructor
	 * @param {(array|function)} [iterator=[]] - An array to iterate over or a function that returns an iterator.
	 */
	 var Enumerable = function () {
	 	var arg0 = arguments[0] || [];
	 	if (isArray(arg0)) {
	 		this.getIterator = function () {
	 			return new ArrayIterator(arg0);
	 		};
	 	} else {
	 		this.getIterator = arg0;
	 	}
	 };

	 var p = Enumerable.prototype;

    /**
     * A function that is applied to each element in an enumerable.
     *
     * @callback forEachCallback
     * @param {*} element - The current element in the for loop.
     * @param {Number} index - The index of the current element.
     * @returns {bool} - Return false (or falsey, but not null or undefined) to jump out of the loop early.
     */

    /**
     * Performs the specified action on each element of the collection.
     * @param {forEachCallback} callback - The callback that is applied to each element in the enumerable.
     * @function forEach
     * @memberof arrgh.Enumerable
     * @instance
     */
     p.forEach = function (callback) {
     	var enumerator = this.getIterator();
     	var cont = null;
     	while ((isNull(cont) || cont) && enumerator.moveNext()) {
     		cont = callback(enumerator.current(), enumerator.getIndex());
     	}
     };

    /**
     * Converts the collection to a JavaScript array.
     * @function toArray
     * @memberof arrgh.Enumerable
     * @instance
     * @returns {array} - Returns a JavaScript array.
     */
     p.toArray = function () {
     	var arr = [];
     	this.forEach(function (elem) {
     		arr.push(elem);
     	});
     	return arr;
     };

	/**
     * Converts the collection to a JavaScript array.
     * @function toArray
     * @memberof arrgh.Enumerable
     * @instance
     * @returns {array} - Returns a JavaScript array.
     */
     p.count = function (predicate) {
     	var count = 0;
     	predicate = predicate || alwaysTrue;

     	this.forEach(function (elem) {
     		if (predicate(elem)) {
     			count += 1;
     		}
     	});
     	return count;
     };
     p.length = p.count;

     p.indexOf = function (searchElem, fromIndex) {
     	var arr = this.toArray();
     	if (Array.prototype.indexOf) {
     		return arr.indexOf(searchElem, fromIndex);
     	}

     	var len = this.count();
     	fromIndex = fromIndex || -1;

     	if (len === 0 || fromIndex > len) {
     		return -1;
     	}

     	var foundIndex = -1;
     	var i;
     	for (i = fromIndex; i < len; i += 1) {
     		if (arr[i] === searchElem) {
     			foundIndex = i;
     			break;
     		}
     	}
     	return foundIndex;
     };

     p.filter = function (predicate) {
     	var self = this;
     	return new Enumerable(function () {
     		return new WhereIterator(self, predicate);
     	});
     };
     p.where = p.filter;

     p.map = function (selector) {
     	var self = this;
     	return new Enumerable(function () {
     		return new SelectIterator(self, selector);
     	});
     };
     p.select = p.map;

     p.first = function (predicate) {
     	if (this.length() > 0) {
     		var first;
     		var found = false;
     		this.forEach(function (elem) {
     			if (predicate) {
     				if (predicate(elem)) {
     					first = elem;
     					found = true;
     					return false;
     				}
     			} else {
     				first = elem;
     				found = true;
     				return false;
     			}
     		});
     		if (!found) {
     			throw "Collection contains no matching element.";
     		}
     		return first;
     	} else {
     		throw "Collection contains no elements.";
     	}
     };

     p.tail = function () {
     	if (this.length() > 0) {
     		var elems = [];
     		this.forEach(function (elem, index) {
     			if (index !== 0) {
     				elems.push(elem);
     			}
     		});
     		return elems;
     	} else {
     		throw "Collection contains no elements.";
     	}
     };

     p.contains = function (elem, comparer) {
     	comparer = comparer || eqComparer;

     	var hasElem = false;
     	this.forEach(function (item) {
     		if (item === elem) {
     			hasElem = true;
     			return false;
     		}
     	});
     	return hasElem;
     };

     p.unionAll = function (other) {
     	return new Enumerable(this.toArray().concat(other.toArray()));
     };

     p.union = function (other, comparer) {
     	return new Enumerable(function () {
     		return new UnionIterator(this, other, comparer || eqComparer);
     	});
     };

     p.toList = function () {
     	return new List(this.toArray());
     };

     p.asEnumerable = function () {
     	return new Enumerable(this.getIterator);
     };

     p.orderBy = function (keySelector) {
     	return new OrderedEnumerable(this, keySelector, false);
     };

     p.orderByDescending = function (keySelector) {
     	return new OrderedEnumerable(this, keySelector, true);
     };

     var DictionaryIterator = function (dict) {
     	var keys = dict.getKeys();
     	var len = keys.count();
     	var index = -1;
     	var currentKey;
     	this.getIndex = function () {
     		return index;
     	};
     	this.moveNext = function () {
     		if (dict.length !== len) {
     			throw "Collection was modified, enumeration operation may not execute.";
     		}
     		index += 1;
     		currentKey = keys[index];
     		return index < len;
     	};
     	this.current = function () {
     		return { key: currentKey, value: dict[currentKey] };
     	};
     };

     var Dictionary = function (arr) {
     	var self = this;
     	Enumerable.call(self, function () {
     		return new DictionaryIterator(self);
     	});

     	self.length = 0;
     	self._ = {
     		keys: {},
     		values: new List()
     	};
     };
     inherit(Dictionary, Enumerable);

     p = Dictionary.prototype;

     p.hasKey = function (key) {
     	return this._.keys.hasOwnProperty(key);
     };

     p.add = function (key, value) {
     	if (this.hasKey(key)) {
     		throw "Key is already present in the dictionary.";
     	}
     	this[key] = value;
     	this._.keys[key] = value;
     	this._.values.add(value);
     	this.length += 1;
     };

     p.getKeys = function () {
     	var list = new List();
     	var prop;
     	for (prop in this._.keys) {
     		if (this._.keys.hasOwnProperty(prop)) {
     			list.add(prop);
     		}
     	}
     	return list;
     };

     p.getValues = function () {
     	return this._.values.toList();
     };

    /**
	 * Represents a list of objects that can be accessed by index. Provides methods to manipulate the list.
	 * @memberof arrgh
	 * @constructor
	 * @extends arrgh.Enumerable
	 * @param {array} [arr] - An array whose elements are copied to the new list.
	 */
	 var List = function (arr) {
	 	var self = this;
	 	Enumerable.call(self, function () {
	 		return new ArrayIterator(self);
	 	});

	 	arr = arr || [];
	 	self.length = arr.length;

	 	var i;
	 	for (i = 0; i < arr.length; i += 1) {
	 		self[i] = arr[i];
	 	}
	 };
	 inherit(List, Enumerable);

	 p = List.prototype;

	 p.add = function (elem) {
	 	var len = this.length;
	 	if (this[len] !== undefined) {
	 		throw "Index " + len + " already declared.";
	 	}
	 	this[len] = elem;
	 	this.length += 1;
	 };

	 p.addRange = function () {
	 	if (arguments.length > 1 || isArray(arguments[0])) {
	 		var arr = arguments.length > 1 ? arguments : arguments[0];
	 		var i;
	 		for (i = 0; i < arr.length; i += 1) {
	 			this.add(arr[i]);
	 		}
	 	} else {
	 		var self = this;
            // Assume an Enumerable was passed as argument.
            arguments[0].forEach(function (elem) {
            	self.add(elem);
            });
        }
    };

    p.push = function () {
    	this.addRange(arguments);
    	return this.length;
    };

    p.remove = function (elem) {
    	var len = this.length;
    	var i;
    	var found = false;
    	for (i = 0; i < len; i += 1) {
    		found = found || this[i] === elem;
    		if (found) {
    			this[i] = this[i + 1];
    		}
    	}
    	if (found) {
    		delete this[len - 1];
    		this.length -= 1;
    	}
    	return found;
    };

    p.count = function (predicate) {
    	if (!predicate) {
    		return this.length;
    	} else {
    		return Enumerable.prototype.count.call(this, predicate);
    	}
    };
    p.length = p.count;

    var OrderedIterator = (function () {
    	var getNextSource = function (source, currentSource) {
    		var next = source;
    		while (next._.source instanceof OrderedEnumerable && next._.source !== currentSource) {
    			next = next._.source;
    		}
    		return next;
    	};
    	var compare = function (a, b) {
    		if (isNotNull(a) && isNull(b)) {
    			return 1;
    		} else if (isNull(a) && isNotNull(b)) {
    			return -1;
    		} else if (isNull(a) && isNull(b)) {
    			return 0;
    		} else if (a > b) {
    			return 1;
    		} else if (a < b) {
    			return -1;
    		} else {
    			return 0;
    		}
    	};
    	return function (source) {
    		var self = this;

    		var arr;
    		var len;
    		var index = -1;
    		self.getIndex = function () {
    			return index;
    		};
    		self.moveNext = function () {
    			if (index === -1) {
    				var parent = getNextSource(source);
                    // Make sure the source is fully evaluated by calling toArray().
                    arr = qsort(new Enumerable(parent._.source.toArray()), function (x, y) {
                    	var result;
                    	var cont = true;
                    	var currentSource = parent;
                    	while (cont) {
                    		result = compare(currentSource._.keySelector(x), currentSource._.keySelector(y)) * currentSource._.descending;
                    		if (result !== 0) {
                    			break;
                    		}
                    		if (currentSource === source) {
                    			cont = false;
                    		} else {
                    			currentSource = getNextSource(source, currentSource);
                    		}
                    	}
                    	return result;
                    }).toArray();
                    len = arr.length;
                }
                index += 1;
                return index < len;
            };
            self.current = function () {
            	return arr[index];
            };
        };
    }());

    var OrderedEnumerable = function (source, keySelector, descending) {
    	var self = this;
    	Enumerable.call(this, function () {
    		return new OrderedIterator(self);
    	});
    	self._ = {
    		source: source,
    		keySelector: keySelector || identity,
    		descending: descending ? -1 : 1
    	};
    };
    inherit(OrderedEnumerable, Enumerable);

    p = OrderedEnumerable.prototype;
    p.thenBy = function (keySelector) {
    	return new OrderedEnumerable(this, keySelector, false);
    };

    p.thenByDescending = function (keySelector) {
    	return new OrderedEnumerable(this, keySelector, true);
    };

    return {
    	Enumerable: Enumerable,
    	List: List,
    	Dictionary: Dictionary
    };
}());