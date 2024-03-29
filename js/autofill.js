(function() {
	var _ = function(input, o) {
	  var me = this;
	  _.count = (_.count || 0) + 1;
	  this.count = _.count;
	  this.isOpened = false;
	  this.input = $(input);
	  this.input.setAttribute("autocomplete", "off");
	  this.input.setAttribute("aria-expanded", "false");
	  this.input.setAttribute("aria-owns", "autofill_list_" + this.count);
	  this.input.setAttribute("role", "combobox");
	  this.options = o = o || {};
	  configure(this, {
		minChars: 2,
		maxItems: 10,
		autoFirst: false,
		data: _.DATA,
		filter: _.FILTER_CONTAINS,
		sort: o.sort === false ? false : _.SORT_BYLENGTH,
		container: _.CONTAINER,
		item: _.ITEM,
		replace: _.REPLACE,
		tabSelect: false
	  }, o);
	  this.index = -1;
	  this.container = this.container(input);
	  this.ul = $.create("ul", {
		hidden: "hidden",
		role: "listbox",
		id: "autofill_list_" + this.count,
		inside: this.container
	  });
	  this.status = $.create("span", {
		className: "visually-hidden",
		role: "status",
		"aria-live": "assertive",
		"aria-atomic": true,
		inside: this.container,
		textContent: this.minChars != 0 ? ("Type " + this.minChars + " or more characters for results.") : "Begin typing for results."
	  });
	  this._events = {
		input: {
		  "input": this.evaluate.bind(this),
		  "blur": this.close.bind(this, {
			reason: "blur"
		  }),
		  "keydown": function(evt) {
			var c = evt.keyCode;
			if (me.opened) {
			  if (c === 13 && me.selected) {
				evt.preventDefault();
				me.select(undefined, undefined, evt);
			  } else if (c === 9 && me.selected && me.tabSelect) {
				me.select(undefined, undefined, evt);
			  } else if (c === 27) {
				me.close({
				  reason: "esc"
				});
			  } else if (c === 38 || c === 40) {
				evt.preventDefault();
				me[c === 38 ? "previous" : "next"]();
			  }
			}
		  }
		},
		form: {
		  "submit": this.close.bind(this, {
			reason: "submit"
		  })
		},
		ul: {
		  "mousedown": function(evt) {
			evt.preventDefault();
		  },
		  "click": function(evt) {
			var li = evt.target;
			if (li !== this) {
			  while (li && !/li/i.test(li.nodeName)) {
				li = li.parentNode;
			  }
			  if (li && evt.button === 0) {
				evt.preventDefault();
				me.select(li, evt.target, evt);
			  }
			}
		  }
		}
	  };
	  $.bind(this.input, this._events.input);
	  $.bind(this.input.form, this._events.form);
	  $.bind(this.ul, this._events.ul);
	  if (this.input.hasAttribute("list")) {
		this.list = "#" + this.input.getAttribute("list");
		this.input.removeAttribute("list");
	  } else {
		this.list = this.input.getAttribute("data-list") || o.list || [];
	  }
	  _.all.push(this);
	};
	_.prototype = {
	  set list(list) {
		if (Array.isArray(list)) {
		  this._list = list;
		} else if (typeof list === "string" && list.indexOf(",") > -1) {
		  this._list = list.split(/\s*,\s*/);
		} else {
		  list = $(list);
		  if (list && list.children) {
			var items = [];
			slice.apply(list.children).forEach(function(el) {
			  if (!el.disabled) {
				var text = el.textContent.trim();
				var value = el.value || text;
				var label = el.label || text;
				if (value !== "") {
				  items.push({
					label: label,
					value: value
				  });
				}
			  }
			});
			this._list = items;
		  }
		}
		if (document.activeElement === this.input) {
		  this.evaluate();
		}
	  },
	  get selected() {
		return this.index > -1;
	  },
	  get opened() {
		return this.isOpened;
	  },
	  close: function(o) {
		if (!this.opened) {
		  return;
		}
		this.input.setAttribute("aria-expanded", "false");
		this.ul.setAttribute("hidden", "");
		this.isOpened = false;
		this.index = -1;
		this.status.setAttribute("hidden", "");
		$.fire(this.input, "autofill-close", o || {});
	  },
	  open: function() {
		this.input.setAttribute("aria-expanded", "true");
		this.ul.removeAttribute("hidden");
		this.isOpened = true;
		this.status.removeAttribute("hidden");
		if (this.autoFirst && this.index === -1) {
		  this.goto(0);
		}
		$.fire(this.input, "autofill-open");
	  },
	  destroy: function() {
		$.unbind(this.input, this._events.input);
		$.unbind(this.input.form, this._events.form);
		if (!this.options.container) {
		  var parentNode = this.container.parentNode;
		  parentNode.insertBefore(this.input, this.container);
		  parentNode.removeChild(this.container);
		}
		this.input.removeAttribute("autocomplete");
		this.input.removeAttribute("aria-autocomplete");
		var indexOfAutofill = _.all.indexOf(this);
		if (indexOfAutofill !== -1) {
		  _.all.splice(indexOfAutofill, 1);
		}
	  },
	  next: function() {
		var count = this.ul.children.length;
		this.goto(this.index < count - 1 ? this.index + 1 : (count ? 0 : -1));
	  },
	  previous: function() {
		var count = this.ul.children.length;
		var pos = this.index - 1;
		this.goto(this.selected && pos !== -1 ? pos : count - 1);
	  },
	  goto: function(i) {
		var lis = this.ul.children;
		if (this.selected) {
		  lis[this.index].setAttribute("aria-selected", "false");
		}
		this.index = i;
		if (i > -1 && lis.length > 0) {
		  lis[i].setAttribute("aria-selected", "true");
		  this.status.textContent = lis[i].textContent + ", list item " + (i + 1) + " of " + lis.length;
		  this.input.setAttribute("aria-activedescendant", this.ul.id + "_item_" + this.index);
		  this.ul.scrollTop = lis[i].offsetTop - this.ul.clientHeight + lis[i].clientHeight;
		  $.fire(this.input, "autofill-highlight", {
			text: this.suggestions[this.index]
		  });
		}
	  },
	  select: function(selected, origin, originalEvent) {
		if (selected) {
		  this.index = $.siblingIndex(selected);
		} else {
		  selected = this.ul.children[this.index];
		}
		if (selected) {
		  var suggestion = this.suggestions[this.index];
		  var allowed = $.fire(this.input, "autofill-select", {
			text: suggestion,
			origin: origin || selected,
			originalEvent: originalEvent
		  });
		  if (allowed) {
			this.replace(suggestion);
			this.close({
			  reason: "select"
			});
			$.fire(this.input, "autofill-selectcomplete", {
			  text: suggestion,
			  originalEvent: originalEvent
			});
		  }
		}
	  },
	  evaluate: function() {
		var me = this;
		var value = this.input.value;
		if (value.length >= this.minChars && this._list && this._list.length > 0) {
		  this.index = -1;
		  this.ul.innerHTML = "";
		  this.suggestions = this._list.map(function(item) {
			return new Suggestion(me.data(item, value));
		  }).filter(function(item) {
			return me.filter(item, value);
		  });
		  if (this.sort !== false) {
			this.suggestions = this.suggestions.sort(this.sort);
		  }
		  this.suggestions = this.suggestions.slice(0, this.maxItems);
		  this.suggestions.forEach(function(text, index) {
			me.ul.appendChild(me.item(text, value, index));
		  });
		  if (this.ul.children.length === 0) {
			this.status.textContent = "No results found";
			this.close({
			  reason: "nomatches"
			});
		  } else {
			this.open();
			this.status.textContent = this.ul.children.length + " results found";
		  }
		} else {
		  this.close({
			reason: "nomatches"
		  });
		  this.status.textContent = "No results found";
		}
	  }
	};
	_.all = [];
	_.FILTER_CONTAINS = function(text, input) {
	  return RegExp($.regExpEscape(input.trim()), "i").test(text);
	};
	_.FILTER_STARTSWITH = function(text, input) {
	  return RegExp("^" + $.regExpEscape(input.trim()), "i").test(text);
	};
	_.SORT_BYLENGTH = function(a, b) {
	  if (a.length !== b.length) {
		return a.length - b.length;
	  }
	  return a < b ? -1 : 1;
	};
	_.CONTAINER = function(input) {
	  return $.create("div", {
		className: "autofill",
		around: input
	  });
	}
	_.ITEM = function(text, input, item_id) {
	  var html = input.trim() === "" ? text : text.replace(RegExp($.regExpEscape(input.trim()), "gi"), "<mark>$&</mark>");
	  return $.create("li", {
		innerHTML: html,
		"role": "option",
		"aria-selected": "false",
		"id": "autofill" + this.count + "_item_" + item_id
	  });
	};
	_.REPLACE = function(text) {
	  this.input.value = text.value;
	};
	_.DATA = function(item) {
	  return item;
	};
  
	function Suggestion(data) {
	  var o = Array.isArray(data) ? {
		label: data[0],
		value: data[1]
	  } : typeof data === "object" && "label" in data && "value" in data ? data : {
		label: data,
		value: data
	  };
	  this.label = o.label || o.value;
	  this.value = o.value;
	}
	Object.defineProperty(Suggestion.prototype = Object.create(String.prototype), "length", {
	  get: function() {
		return this.label.length;
	  }
	});
	Suggestion.prototype.toString = Suggestion.prototype.valueOf = function() {
	  return "" + this.label;
	};
  
	function configure(instance, properties, o) {
	  for (var i in properties) {
		var initial = properties[i],
		  attrValue = instance.input.getAttribute("data-" + i.toLowerCase());
		if (typeof initial === "number") {
		  instance[i] = parseInt(attrValue);
		} else if (initial === false) {
		  instance[i] = attrValue !== null;
		} else if (initial instanceof Function) {
		  instance[i] = null;
		} else {
		  instance[i] = attrValue;
		}
		if (!instance[i] && instance[i] !== 0) {
		  instance[i] = (i in o) ? o[i] : initial;
		}
	  }
	}
	var slice = Array.prototype.slice;
  
	function $(expr, con) {
	  return typeof expr === "string" ? (con || document).querySelector(expr) : expr || null;
	}
  
	function $$(expr, con) {
	  return slice.call((con || document).querySelectorAll(expr));
	}
	$.create = function(tag, o) {
	  var element = document.createElement(tag);
	  for (var i in o) {
		var val = o[i];
		if (i === "inside") {
		  $(val).appendChild(element);
		} else if (i === "around") {
		  var ref = $(val);
		  ref.parentNode.insertBefore(element, ref);
		  element.appendChild(ref);
		  if (ref.getAttribute("autofocus") != null) {
			ref.focus();
		  }
		} else if (i in element) {
		  element[i] = val;
		} else {
		  element.setAttribute(i, val);
		}
	  }
	  return element;
	};
	$.bind = function(element, o) {
	  if (element) {
		for (var event in o) {
		  var callback = o[event];
		  event.split(/\s+/).forEach(function(event) {
			element.addEventListener(event, callback);
		  });
		}
	  }
	};
	$.unbind = function(element, o) {
	  if (element) {
		for (var event in o) {
		  var callback = o[event];
		  event.split(/\s+/).forEach(function(event) {
			element.removeEventListener(event, callback);
		  });
		}
	  }
	};
	$.fire = function(target, type, properties) {
	  var evt = document.createEvent("HTMLEvents");
	  evt.initEvent(type, true, true);
	  for (var j in properties) {
		evt[j] = properties[j];
	  }
	  return target.dispatchEvent(evt);
	};
	$.regExpEscape = function(s) {
	  return s.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&");
	};
	$.siblingIndex = function(el) {
	  for (var i = 0; el = el.previousElementSibling; i++);
	  return i;
	};
  
	function init() {
	  $$("input.autofill").forEach(function(input) {
		new _(input);
	  });
	}
	if (typeof self !== "undefined") {
	  self.Autofill = _;
	}
	if (typeof Document !== "undefined") {
	  if (document.readyState !== "loading") {
		init();
	  } else {
		document.addEventListener("DOMContentLoaded", init);
	  }
	}
	_.$ = $;
	_.$$ = $$;
	if (typeof module === "object" && module.exports) {
	  module.exports = _;
	}
	return _;
  }());