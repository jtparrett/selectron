// --------------------------------------------------------------------------
//            _           _                   
//   ___  ___| | ___  ___| |_ _ __ ___  _ __  
//  / __|/ _ \ |/ _ \/ __| __| '__/ _ \| '_ \ 
//  \__ \  __/ |  __/ (__| |_| | | (_) | | | |
//  |___/\___|_|\___|\___|\__|_|  \___/|_| |_|
//
// --------------------------------------------------------------------------
//  Version: 1.1.1
//   Author: Simon Sturgess
//  Website: dahliacreative.github.io/selectron
//     Docs: dahliacreative.github.io/selectron/docs
//     Repo: github.com/dahliacreative/selectron
//   Issues: github.com/dahliacreative/selectron/issues
// --------------------------------------------------------------------------

(function(window, $) {

  $.fn.selectron = function(options) {
    return this.each(function() {
      new Selectron($(this), options).build();
    });
  };

})(window, jQuery);

// --------------------------------------------------------------------------
// Selectron Constructor
// --------------------------------------------------------------------------
var Selectron = function(select, options) {
  if(select.hasClass('selectron__select') || select[0].tagName !== 'SELECT') {
    return;
  }
  this.options = $.extend({}, options);
  this.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
  this.isDisabled = select.prop('disabled');
  this.select = select;
};

// --------------------------------------------------------------------------
// Build the DOM
// --------------------------------------------------------------------------
Selectron.prototype.build = function() {
  var wrapperClasses = this.select.attr('class');
  this.wrapper = $('<div/>', { 'class': 'selectron' });
  this.wrapper
    .addClass(wrapperClasses)
    .toggleClass('selectron--disabled', this.isDisabled)
    .toggleClass('selectron--is-touch', this.isTouch);

  this.select
    .removeAttr('class')
    .addClass('selectron__select');

  this.select.replaceWith(this.wrapper);

  if(this.isTouch) {
    this.wrapper.append(this.select);
  } else {
    if(this.options.search) {
      this.search = $('<input/>', { 
        'type': 'text',
        'class': 'selectron__search' ,
        'placeholder': 'Search'
      });
      this.noResults = $('<li/>', {
        'class': 'selectron__no-results',
        'text': this.select.data('no-results-text') || 'Sorry there are no matching results'
      });
    }
    this.searchTerm = '';
    this.trigger = $('<button/>', { 'class': 'selectron__trigger', 'type': 'button' });
    this.options = $('<ul/>', { 'class': 'selectron__options' });
    this.wrapper.append(this.select, this.trigger, this.search, this.options);
    this.registerEvents();
    this.populateOptions();
  }
};

// --------------------------------------------------------------------------
// Clear the search term
// --------------------------------------------------------------------------
Selectron.prototype.clearSearchTerm = function() {
  this.searchTerm = "";
}

// --------------------------------------------------------------------------
// Close options
// --------------------------------------------------------------------------
Selectron.prototype.closeOptions = function(search) {
  if(!this.optionsAreHovered) {
    if(!search || search === true && !this.triggerIsHovered) {
      this.options.removeClass('selectron__options--is-open selectron__options--is-overflowing');
      this.trigger.removeClass('selectron__trigger--is-open selectron__trigger--is-overflowing');
      this.search.removeClass('selectron__search--is-open selectron__search--is-overflowing');
      this.isOpen = false;
      this.trigger.focus();
    }
  }
}

// --------------------------------------------------------------------------
// Create option
// --------------------------------------------------------------------------
Selectron.prototype.createOption = function(selectOption, isInGroup) {
  var value = selectOption.val(),
      content = selectOption.text(),
      classes = selectOption.attr('class'),
      isDisabled = selectOption.prop('disabled'),
      isSelected = selectOption.prop('selected'),
      icon = selectOption.data('icon'),
      self = this;

  var option = $('<li/>', {
    'class': 'selectron__option', 
    'data-value': value, 
    'text': content 
  });

  if(icon) {
    var image = $('<img/>', { src: icon, class: 'selectron__icon' });
    option.prepend(image);
  }

  option
    .addClass(classes)
    .toggleClass('selectron__option--is-disabled', isDisabled)
    .toggleClass('selectron__option--is-selected', isSelected)
    .toggleClass('selectron__option--optgroup', isInGroup);

  option.on({
    'click': function() {
      self.updateSelection($(this));
    },
    'mouseenter': function() {
      self.updateHover($(this))
    }
  });

  return option;
}

// --------------------------------------------------------------------------
// Handle Keystrokes
// --------------------------------------------------------------------------
Selectron.prototype.filterOptions = function(e) {
  
  this.handleKeyStrokes(e);
  var searchTerm = this.search.val().toLowerCase(),
      options = this.options.children(':not(".selectron__no-results")'),
      matchedItems = 0;

  for (var i = 0; i < options.length; i++) {
    var option = $(options[i]),
        text = option.text().toLowerCase(),
        matches = text.indexOf(searchTerm) > -1;

    option.toggle(matches);
    if(matches) {
      matchedItems ++;
    }
  }

  if(matchedItems < 1) {
    this.options.append(this.noResults);
  } else {
    this.noResults.remove();
  }
}

// --------------------------------------------------------------------------
// Handle Keystrokes
// --------------------------------------------------------------------------
Selectron.prototype.handleKeyStrokes = function(e) {
  var hovered = this.options.find('.selectron__option--is-hovered'),
      enterKeyPressed = e.which === 13,
      spaceKeyPressed = e.which === 32,
      upArrowKeyPressed = e.which === 38,
      downArrowKeyPressed = e.which === 40,
      escapeKeyPressed = e.which === 27,
      alphaNumbericKeyPressed = (e.which >= 48 && e.which <= 57) || (e.which >= 65 && e.which <= 90) || e.which === 8,
      self = this;

  if(!this.isOpen && (upArrowKeyPressed || downArrowKeyPressed || enterKeyPressed)) {
    return false;
  }

  if(escapeKeyPressed || enterKeyPressed) {
    this.closeOptions();
    if(enterKeyPressed) {
      this.updateSelection(hovered);
    }
  }

  if(spaceKeyPressed) {
    if(this.searchTerm === "") {
      if(!this.isOpen) {
        this.openOptions();
      } else {
        this.closeOptions();
        this.updateSelection(hovered);
      }
    }
  }

  if(upArrowKeyPressed || downArrowKeyPressed) {
    var nextElement;

    if(downArrowKeyPressed) {
        nextElement = hovered.is(':last-child') ? this.options.find('.selectron__option:first-child') : hovered.next();
        if(nextElement.hasClass('selectron__option-group')) {
          nextElement = nextElement.next();
        }
    } else if(upArrowKeyPressed) {
        nextElement = hovered.is(':first-child') ? this.options.find('.selectron__option:last-child') : hovered.prev();
        if(nextElement.hasClass('selectron__option-group')) {
          nextElement = nextElement.prev();
        }
    }

    this.updateHover(nextElement);
    this.updateScrollPosition(nextElement);
  }

  if((alphaNumbericKeyPressed || spaceKeyPressed) && !this.search) {
    clearTimeout(this.searchTimeout);
    
    this.searchTimeout = setTimeout(function() {
      self.clearSearchTerm();
    }, 500);
    this.searchTerm += String.fromCharCode(e.which).toLowerCase();
    optCount = this.options.find('li').length + 1;
    for(var i = 1; i < optCount; i ++) {
      var current = this.options.find('.selectron__option:nth-child(' + i + ')'),
          text = current.text().toLowerCase();
      if(text.indexOf(this.searchTerm) >= 0 && !this.placeholderExists || text.indexOf(this.searchTerm) >= 0 && this.placeholderExists && !current.is(':first-child')) {
        current.addClass('selectron__option--is-hovered').siblings().removeClass('selectron__option--is-hovered');
        if(!this.isOpen) {
          this.updateSelection(hovered);
        }
        return;
      }
    }
  }

}

// --------------------------------------------------------------------------
// Open Options
// --------------------------------------------------------------------------
Selectron.prototype.openOptions = function() {
  if(!this.isDisabled) {
    var win = $(window),
        optionsBottom = this.options.offset().top + this.options.height(),
        scrollPosition = win.scrollTop(),
        windowHeight = win.height(),
        isOverflowing = optionsBottom > (windowHeight - scrollPosition);

    this.options
      .addClass('selectron__options--is-open')
      .toggleClass('selectron__options--is-overflowing', isOverflowing);

    this.trigger
      .addClass('selectron__trigger--is-open')
      .toggleClass('selectron__trigger--is-overflowing', isOverflowing);

    if(this.search) {
      this.search
        .addClass('selectron__search--is-open')
        .toggleClass('selectron__search--is-overflowing', isOverflowing)
        .focus();
    }

    this.isOpen = true;
  }
}

// --------------------------------------------------------------------------
// Populate Options
// --------------------------------------------------------------------------
Selectron.prototype.populateOptions = function() {
  var self = this,
      selectCildren = self.select.children();

  selectCildren.each(function() {
    var child = $(this),
        isOptGroup = child.is('optgroup');

    if(isOptGroup) {
      var groupOptions = child.children(),
          content = child.attr('label'),
          icon = child.data('icon'),
          classes = child.attr('class');

          var optionGroup = $('<li/>', {
            class: 'selectron__option-group',
            text: content
          })
          .addClass(classes);

          if(icon) {
            var image = $('<img/>', { src: icon, class: 'selectron__icon' });
            optionGroup.prepend(image);
          }

      self.options.append(optionGroup);
      groupOptions.each(function() {
        var groupOption = $(this);
        self.options.append(self.createOption(groupOption, true));
      });
    } else {
      self.options.append(self.createOption(child, false));
    }
  });

  var firstOption = this.options.find('.selectron__option:first');
  firstOption.addClass('selectron__option--is-hovered');
  this.placeholderExists = firstOption.data('value') === '';

  this.updateTrigger();
};

// --------------------------------------------------------------------------
// Register Events
// --------------------------------------------------------------------------
Selectron.prototype.registerEvents = function() {
  var self = this;

  this.trigger.on({
    'click': function(e) {
      this.focus();
      self.toggleOptions(e);
    },
    'keyup': function(e) {
      self.handleKeyStrokes(e);
    },
    'keydown': function(e) {
      var tabKeyPressed = e.which === 9;
      if(!tabKeyPressed) {
        e.preventDefault();
      }
    },
    'blur': function() {
      if(!self.search) {
        self.closeOptions();
      }
    },
    'mouseenter': function() {
      self.triggerIsHovered = true;
    },
    'mouseleave': function() {
      self.triggerIsHovered = false;
    }
  });

  this.select.on({
    'selectron.update': function() {
      self.options.empty();
      self.populateOptions();
    },
    'selectron.change': function() {
      self.updateValue($(this).val());
    }
  });

  this.options.on({
    'mouseenter': function() {
      self.optionsAreHovered = true;
    },
    'mouseleave': function() {
      self.optionsAreHovered = false;
    }
  });

  if(this.search) {
    this.search.on({
      'keydown': function(e) {
        var upArrowKeyPressed = e.which === 38,
            downArrowKeyPressed = e.which === 40;

        if(downArrowKeyPressed || upArrowKeyPressed) {
          e.preventDefault();
        }    
      },
      'keyup': function(e) {
        self.filterOptions(e);
      },
      'blur': function() {
        self.closeOptions(true);
      }
    });
  }
};

// --------------------------------------------------------------------------
// Toggle Options
// --------------------------------------------------------------------------
Selectron.prototype.toggleOptions = function(e) {
  e.stopPropagation();
  if(!this.isDisabled) {

    var win = $(window),
        optionsBottom = this.options.offset().top + this.options.height(),
        scrollPosition = win.scrollTop(),
        windowHeight = win.height(),
        isOverflowing = optionsBottom > (windowHeight - scrollPosition);

    this.options
      .toggleClass('selectron__options--is-open')
      .toggleClass('selectron__options--is-overflowing', isOverflowing);

    this.trigger.toggleClass('selectron__trigger--is-open')
      .toggleClass('selectron__trigger--is-overflowing', isOverflowing);

    if(this.search) {
      this.search.toggleClass('selectron__search--is-open')
        .toggleClass('selectron__search--is-overflowing', isOverflowing);
    }

    if(!this.isOpen) {
      this.search.focus();
    }

    this.isOpen = this.trigger.hasClass('selectron__trigger--is-open');
  } 
};

// --------------------------------------------------------------------------
// Update Hover
// --------------------------------------------------------------------------
Selectron.prototype.updateHover = function(hovered) {
  hovered.addClass('selectron__option--is-hovered').siblings().removeClass('selectron__option--is-hovered');
}

// --------------------------------------------------------------------------
// Update Scroll Position
// --------------------------------------------------------------------------
Selectron.prototype.updateScrollPosition = function(hovered) {
  var listHeight = this.options.height(),
      optionTop = hovered.position().top,
      optionHeight = hovered.outerHeight(),
      scrollPosition = this.options.scrollTop();
  if(hovered.is(':first-child')) {
      this.options.scrollTop(0);
  } else if(hovered.is(':last-child')) {
      this.options.scrollTop(this.options[0].scrollHeight);
  } else if(((optionTop + optionHeight) - scrollPosition) > (listHeight)) {
      this.options.scrollTop(optionTop - (listHeight - optionHeight));
  } else if((optionTop - scrollPosition) < 0) {
    this.options.scrollTop(optionTop);
  } 
}
// --------------------------------------------------------------------------
// Update Selection
// --------------------------------------------------------------------------
Selectron.prototype.updateSelection = function(selected) {
  var value = selected.data('value');
  selected.addClass('selectron__option--is-selected').siblings().removeClass('selectron__option--is-selected');
  this.updateTrigger();
  this.select.val(value).trigger('change');
}

// --------------------------------------------------------------------------
// Update Trigger
// --------------------------------------------------------------------------
Selectron.prototype.updateTrigger = function() {
  var selected = this.options.find('.selectron__option--is-selected'),
      content = selected.text(),
      value = selected.data('value'),
      isPlaceholder = value === "" ? true : false;

  this.trigger.html(content);
  this.trigger.toggleClass('selectron__trigger--is-filled', !isPlaceholder);
  this.optionsAreHovered = false;
  if(this.isOpen) {
    this.closeOptions();
  }
}

// --------------------------------------------------------------------------
// Update Value
// --------------------------------------------------------------------------
Selectron.prototype.updateValue = function(value) {
  this.options.find('[data-value="' + value + '"]').addClass('selectron__option--is-selected').siblings().removeClass('selectron__option--is-selected');
  this.updateTrigger();
}