/*!
 *
 __     __          _ _ _         ____        _       _____     _     _
 \ \   / /_ _ _ __ (_) | | __ _  |  _ \  __ _| |_ __ |_   _|_ _| |__ | | ___  ___
  \ \ / / _` | '_ \| | | |/ _` | | | | |/ _` | __/ _` || |/ _` | '_ \| |/ _ \/ __|
   \ V / (_| | | | | | | | (_| | | |_| | (_| | || (_| || | (_| | |_) | |  __/\__ \
    \_/ \__,_|_| |_|_|_|_|\__,_| |____/ \__,_|\__\__,_||_|\__,_|_.__/|_|\___||___/

 * Copyright (c) 2015 Karl Saunders (http://mobiuswebdesign.co.uk)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 *
 * Version: 0.0.2
 *
 */

(function (root, factory) {
	var plugin = 'DataTable';

	if (typeof define === 'function' && define.amd) {
		define([], factory(plugin));
	} else if (typeof exports === 'object') {
		module.exports = factory(plugin);
	} else {
		root[plugin] = factory(plugin);
	}
}(this, function (plugin) {
	'use strict';


	/*------------------------------------------
		  _   _      _
		 | | | | ___| |_ __   ___ _ __ ___
		 | |_| |/ _ \ | '_ \ / _ \ '__/ __|
		 |  _  |  __/ | |_) |  __/ |  \__ \
		 |_| |_|\___|_| .__/ \___|_|  |___/
		              |_|

	-------------------------------------------*/

	/**
	 * Merge defaults with user options
	 * @param {Object} source Default settings
	 * @param {Object} properties User options
	 */
	var extend = function (source, properties) {
		var property;
		for (property in properties) {
			if (properties.hasOwnProperty(property)) {
				source[property] = properties[property];
			}
		}
		return source;
	};

	/**
	 * Check var is an integer
	 * @param  {mixed} value
	 * @return {Boolean}
	 */
	var isInt = function( value ) {
		var x;
		if (isNaN(value)) {
			return false;
		}
		x = parseFloat(value);
		return (x | 0) === x;
	}

	/**
	 * Get the width of an element.
	 * @param  {Node} elem The element to get the height of
	 * @return {Number}    The element's height in pixels
	 */
	var getWidth = function ( elem ) {
		return Math.max( elem.scrollWidth, elem.offsetWidth, elem.clientWidth );
	};

	/**
	 * Get the height of an element.
	 * @param  {Node} elem The element to get the height of
	 * @return {Number}    The element's height in pixels
	 */
	var getHeight = function ( elem ) {
		return Math.max( elem.scrollHeight, elem.offsetHeight, elem.clientHeight );
	};

	/**
	 * Create element helper. Create an element and assign given attributes.
	 * @param  {NodeType} type 	Type of element to create.
	 * @param  {Object} attrs 	The attributes to assign to the element.
	 * @return {HTMLElement}
	 */
	var createElement = function(type, attrs) {
		var elem = document.createElement(type);

		if ( attrs ) {
			for (var attr in attrs) {
				elem.setAttribute(attr, attrs[attr]);
			}
		}

		return elem;
	};

	/**
	 * https://gist.github.com/scopevale/1663452
	 * @param  {Object} arr [description]
	 * @param  {int} 	dir [description]
	 * @return {Object}     [description]
	 */
	var bubbleSort = function(arr, dir) {
		var start, end;
		if (dir === 1) {
			start = 0;
			end = arr.length;
		} else if (dir === -1) {
			start = arr.length-1;
			end = -1;
		}

		var unsorted = true;
		while (unsorted) {
			unsorted = false;
			for (var i=start; i!=end; i=i+dir) {
				if (arr[i+dir] && arr[i].value > arr[i+dir].value) {
					var a = arr[i],
						b = arr[i+dir],
						c = a;
					arr[i] = b;
					arr[i+dir] = c;
					unsorted = true;
				}
			}
		}
		return arr;
	}

	/**
	 * forEach helper
	 */
	var forEach = function (collection, callback, scope) {
		if (Object.prototype.toString.call(collection) === '[object Object]') {
			for (var prop in collection) {
				if (Object.prototype.hasOwnProperty.call(collection, prop)) {
					callback.call(scope, prop, collection[prop], collection);
				}
			}
		} else {
			for (var i = 0, len = collection.length; i < len; i++) {
				callback.call(scope, i, collection[i], collection);
			}
		}
	};

	/**
	 * Plugin Object
	 * @param table The table to initialize
	 * @param {Object} options User options
	 * @constructor
	 */
	function Plugin(table, options) {

		if (!(this instanceof Plugin)) {
			return new Plugin(name)
		}

		this.sorters = [];
		this.paginators = [];

		this.initialRows = null;
		this.initialDimensions = [];

		this.currentPage = 1;
		this.first_page = 1;
		this.onFirstPage = true;
		this.onLastPage = false;

		this.info = {
			items: 0,
			pages: 0,
			range: 0,
		};

		var nodeName = table.tagName.toLowerCase();

		if ( nodeName != "table") {
			console.warn('ERROR: The selected element ('+nodeName+') is not a table!');
			return;
		}

		if ( table.tHead === null && options.sortable ) {
			console.warn('ERROR: The sortable option requires table headings!');
			return;
		}

		this.table = table;
		this.thead = this.table.tHead;
		this.tbody = this.table.tBodies[0];
		this.initialRows = Array.prototype.slice.call(this.tbody.rows);

		/**
		 * Plugin defaults
		 * @type {Object}
		 */
		var defaults = {
			perPage: 10,
			navPosition: 'both',
			selectorPosition: 'bottom',
			nextPrev: true,
			prevText: '&lsaquo;',
			nextText: '&rsaquo;',
			sortable: false,
			fixedHeight: true,
			info: true,
			hideUnusedNavs: false,
			perPageSelect: [5,10,15,20,25],
			change: function() {},
		};


		this.options = extend(defaults, options);
		this.initialize();
	}


	// Plugin prototype
	Plugin.prototype = {

		initialize: function()
		{
			this.setInitialDimensions();
			this.initPages();
			this.build();
		},

		/**
		 * Fix the column widths so they don't change on page switch.
		 * @return {void}
		 */
		setInitialDimensions: function()
		{
			var that = this, cells = that.table.tHead.rows[0].cells, pw = getWidth(that.table);

			forEach(cells, function(index, cell) {
				var w = (getWidth(cell) / pw) * 100;
				that.initialDimensions.push(w);
				cell.style.width = w + '%';
			});
		},

		/**
		 * Set up the initial info to construct the datatable.
		 * @return {void}
		 */
		initPages: function()
		{
			var that = this;

			this.pages = this.initialRows.map( function(e,i) {
				return i%that.options.perPage===0 ? that.initialRows.slice(i,i+that.options.perPage) : null;
			}).filter(function(e){ return e; });

			this.info.items = this.initialRows.length;
			this.info.pages = this.pages.length;
			this.last_page = this.info.pages;
		},

		/**
		 * Construct the datatable
		 * @return {void}
		 */
		build: function()
		{
			var topContainer 		= createElement('div', { class: 'dataTable-top' });
			var bottomContainer 	= createElement('div', { class: 'dataTable-bottom' });
			var container 			= createElement('div', { class: 'dataTable-wrapper' });
			this.tableContainer 	= createElement('div', { class: 'dataTable-container' });
			this.label 				= createElement('div', { class: 'dataTable-info' });
			this.selector 			= this.getSelector();

			// Insert the main container
			this.table.parentNode.insertBefore(container, this.table);

			// Populate table container
			this.tableContainer.appendChild(this.table);

			// Populate bottom container
			bottomContainer.appendChild(this.label);

			// Append the containers
			container.appendChild(topContainer);
			container.appendChild(this.tableContainer);
			container.appendChild(bottomContainer);
			topContainer.appendChild(this.selector);

			// Initialise
			this.showPage();

			if ( this.options.info ) {
				this.updateInfo();
			}

			var paginatorA = createElement('ul', { class: 'dataTable-pagination' });
			this.paginators.push(paginatorA);

			switch(this.options.navPosition)
			{
				case 'top':
					topContainer.appendChild(paginatorA);
					break;

				case 'bottom':
					bottomContainer.appendChild(paginatorA);
					break;

				case 'both':
					var paginatorB = createElement('ul', { class: 'dataTable-pagination' });
					this.paginators.push(paginatorB);
					topContainer.appendChild(paginatorA);
					bottomContainer.appendChild(paginatorB);
					break;
			}

			this.setButtons();

			// Check if the sortable option is set and initialise if so.
			if ( this.options.sortable ) {
				this.initSortable();
			}

			// Fix the height of the table to keep the bottom container fixed in place.
			if ( this.options.fixedHeight) {
				this.tableContainer.style.height = getHeight(this.tableContainer) + 'px';
			}

			this.table.classList.add('dataTable-table');


			this.addEventListeners();
		},

		/**
		 * Attach required event listeners.
		 */
		addEventListeners: function()
		{
			var that = this;

			forEach(that.paginators, function(index, paginator) {
				paginator.addEventListener('click', that.switchPage.bind(that), false);
			})

			that.selector.addEventListener('change', that.updateTable.bind(that), false);
		},

		/**
		 * Change the page.
		 * @param  {event} event
		 * @return {void}
		 */
		switchPage: function(event)
		{
			event = event || window.event;

			var target = event.target, tagName = target.tagName.toLowerCase();

			if ( tagName != 'a' ) return;

			event.preventDefault();

			var page = target.getAttribute('data-page');

			// We don't want to load the current page again.
			if ( page == this.currentPage && target.parentNode.classList.contains('active') )
				return;

			if ( isInt(page)) {
				this.currentPage = parseInt(page, 10);
			}

			// Check we have the nextPrev option enabled
			if ( this.options.nextPrev ) {
				if ( page == 'prev' ) {
					if ( this.onFirstPage )
						return;

					this.currentPage--;
				}

				if ( page == 'next' ) {
					if ( this.onLastPage )
						return;

					this.currentPage++;
				}
			}

			// Show the selected page;
			this.showPage(this.currentPage-1);

			if ( this.options.info ) {
				this.updateInfo();
			}

			this.setClasses();

			this.options.change(this);
		},

		/**
		 * Populate the table with the required page.
		 * @param  {int} index 	The index of the required page.
		 * @return {void}
		 */
		showPage: function(index)
		{
			index = index || 0;

			var that = this, page = document.createDocumentFragment();

			this.tbody.innerHTML = '';

			forEach(this.pages[index], function (i, row) {
				page.appendChild(row);
			});

			that.tbody.appendChild(page);

			this.onFirstPage = false;
			this.onLastPage = false;

			switch (this.currentPage) {
				case 1:
					this.onFirstPage = true;
					break;
				case this.last_page:
					this.onLastPage = true
					break;
			}
		},

		/**
		 * Update the table info (Showing x to y of z rows)
		 * @return {void}
		 */
		updateInfo: function()
		{
			if ( this.info.pages <= 1 )
				this.label.innerHTML = null;

			var current = this.currentPage-1,
				f = (current) * this.options.perPage,
				t = f + this.pages[current].length;

			this.label.innerHTML = 'Showing ' + (f + 1) + ' to ' + t + ' of ' + this.info.items + ' rows';
		},

		/**
		 * Set the correct number of paginator buttons.
		 * @return {void}
		 */
		setButtons: function()
		{
			var that = this;

			forEach(that.paginators, function(index, paginator) {
				paginator.innerHTML = '';

				if ( that.pages.length <= 1 )
					return;

				if ( that.options.nextPrev )
					paginator.appendChild(that.getButton('prev'));

				forEach(that.pages, function(i, page) {
					var li 	= createElement('li', { class: ( i == 0 ) ? 'active' : '' });
					var a 	= createElement('a', { href: '#', 'data-page': i+1 });
					var t 	= document.createTextNode(i+1);

					a.appendChild(t);
					li.appendChild(a);
					paginator.appendChild(li);
				});

				if ( that.options.nextPrev )
					paginator.appendChild(that.getButton('next'));
			});
		},

		/**
		 * Set the active, disabled and hidden classes on the paginator buttons.
		 * @param {[type]} node [description]
		 */
		setClasses: function(node)
		{
			var self = this,
				onFirstPage = self.onFirstPage,
				onLastPage = self.onLastPage,
				nextPrev = self.options.nextPrev,
				hideNavs = self.options.hideUnusedNavs;

			forEach(self.paginators, function(index, paginator) {
				var links = paginator.children,
					inactive = hideNavs ? 'hidden' : 'disabled';

				forEach(links, function(i, link) {
					link.classList.remove('active', 'disabled', 'hidden');
				});

				// We're on the first page so disable / hide the prev button.
				if ( onFirstPage )
					paginator.firstElementChild.classList.add(inactive);

				// We're on the last page so disable / hide the next button.
				if ( onLastPage )
					paginator.lastElementChild.classList.add(inactive);

				// Add the 'active' class to the correct button
				var n = nextPrev ? self.currentPage : self.currentPage-1;
				paginator.children[n].classList.add('active');
			});
		},

		/**
		 * Make a next / prev button.
		 * @param  {string} direction The direction we want (next or prev)
		 * @return {HTMLElement}
		 */
		getButton: function(direction)
		{
			var li = createElement('li'),
				a = createElement('a', { href: '#', 'data-page': direction });

			a.innerHTML = direction == 'prev' ? this.options.prevText : this.options.nextText;

			li.appendChild(a);

			return li;
		},

		/**
		 * Update the table contents
		 * @param  {event}
		 * @return {void}
		 */
		updateTable: function(event)
		{
			event = event || window.event;

			var target = event.target;

			this.currentPage = 1;

			if ( target.nodeName.toLowerCase() == 'select' )
				this.options.perPage = parseInt(target.value, 10);

			this.tableContainer.style.height = null;

			this.initPages();
			this.showPage();
			this.setButtons();

			if ( this.options.info )
				this.updateInfo();

			this.tableContainer.style.height = getHeight(this.tableContainer) + 'px';
		},

		/**
		 * Inititialse the sortable option.
		 * @return {void}
		 */
		initSortable: function()
		{
			var self = this, cols = self.thead.rows[0].cells;

			forEach(cols, function(index, heading) {
				var label = heading.innerHTML;
				var link = createElement('a', {
					'href' : '#',
					'class' : 'dataTable-sorter'
				});
				heading.cIdx = index;
				heading.innerHTML = null;
				heading.className = 'asc';
				heading.appendChild(link);

				link.innerHTML = label;
				link.onclick = function (that) {
					return function (event) {
						self.sortItems(event);
						return false;
					}
				}(this);
			});
		},

		/**
		 * Perform the sorting
		 * @param  {event} event
		 * @return {void}
		 */
		sortItems: function(event)
		{
			event = event || window.event;

			var that = this, target = event.target;

			if ( target.nodeName.toLowerCase() != 'a' )
				return;

			/*
			 * Get cell data for column that is to be sorted from HTML table
			 */
			var rows = that.initialRows;
			var alpha = [], numeric = [];
			var aIdx = 0, nIdx = 0;
			var th = target.parentElement;
			var cellIndex = th.cIdx;
			for (var i=0; rows[i]; i++) {
				var cell = rows[i].cells[cellIndex];
				var content = cell.textContent ? cell.textContent : cell.innerText;
				/*
				 * Split data into two separate arrays, one for numeric content and
				 * one for everything else (alphabetic). Store both the actual data
				 * that will be used for comparison by the sort algorithm (thus the need
				 * to parseFloat() the numeric data) as well as a reference to the
				 * element's parent row. The row reference will be used after the new
				 * order of content is determined in order to actually reorder the HTML
				 * table's rows.
				 */
				var num = content.replace(/(\$|\,|\s)/g, "");
				  if (parseFloat(num) == num) {
					numeric[nIdx++] = {
						value: Number(num),
						row: rows[i]
					}
				} else {
					alpha[aIdx++] = {
						value: content,
						row: rows[i]
					}
				}
			}

			/*
			 * Sort according to direction (ascending or descending)
			 */
			var col = [], top, bottom;
			if (th.classList.contains("asc")) {
				top = bubbleSort(alpha, -1);
				bottom = bubbleSort(numeric, -1);
				th.classList.remove('asc');
				th.classList.add('desc');
			} else {
				top = bubbleSort(numeric, 1);
				bottom = bubbleSort(alpha, 1);
				if (th.classList.contains("desc")) {
					th.classList.remove('desc');
					th.classList.add('asc');
				} else {
					th.classList.add('asc');
				}
			}

			/*
			 * Clear asc/desc class names from the last sorted column's th if it isn't the
			 * same as the one that was just clicked
			 */
			if (this.lastSortedTh && th != this.lastSortedTh) {
				this.lastSortedTh.classList.remove('desc', 'asc');
			}
			this.lastSortedTh = th;


			/*
			 *  Reorder the table
			 */
			var rows = top.concat(bottom);
			this.initialRows = [];

			forEach(rows, function(i, row) {
				that.initialRows.push(row['row']);
			});

			that.updateTable(event);
		},

		/**
		 * Build the perPage selector;
		 * @return {HTMLElement}
		 */
		getSelector: function()
		{
			var select 	= createElement('select', { class: 'form-control dataTable-selector' });

			forEach(this.options.perPageSelect, function(i, value) {
				var option = createElement('option');
				option.value = value;
				option.innerHTML = value;
				select.appendChild(option);
			});

			select.value = this.options.perPage;

			return select;
		},

	};

	return Plugin;
}));