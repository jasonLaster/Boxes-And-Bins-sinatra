var iterator = 0;
var box_id = "";
var container_id = "";
var text_selection = null;

$(document).ready(function(){
  events();
  $('#flash').hide()
  fixSquarePosition();

  // load page
  load_page(content)
  box_id = max_id('.box');
  container_id = max_id('.container.horizontal, .container.vertical, .container.simple');

  // setup mode related stuff
  box_edit_mode();
})


// create elements
var clear_div = function(){
  return $('<div class="clear">');
}

var create_text_box = function(){

  var e = {};
  e.box = $('<div class="box">');
  e.header = $('<div class="header">');
  e.buttons = $('<ul class="buttons">')
    .append($('<li class="left button">').html("&larr;"))
    .append($('<li class="right button">').html("&rarr;"))
    .append($('<li class="up button">').html("&uarr;"))
    .append($('<li class="down button">').html("&darr;"));
  e.remove = $('<div class="remove">');
  e.remove_button = $('<div class="remove_button">');
  e.square = $('<div class="square">');
  e.body = $('<div class="body">');
  e.content = $('<div class="content">');

  e.content
    .attr('contenteditable', 'true')

  e.content.html($('<p><span><br></span></p>'));

  e.box.attr('id', ++box_id);

  e.remove
    .append(e.remove_button);

  e.header.addClass('ce');

  e.header
    .append(e.remove)
    .append(e.buttons)
    .append(clear_div());

  e.body
    .append(e.content)
    .append(e.square.clone().addClass('left'))
    .append(e.square.clone().addClass('bottom'))
    .append(e.square.clone().addClass('right'));

  e.box
    .append(e.header)
    .append(e.body);

  e.buttons.hide();
  e.remove.hide();
  e.square
  return e.box;
}

// also changed
var create_simple_container = function(){
  var container = $('<div class="simple container ce">');
  var text_box = create_text_box();

  container
    .attr('id', ++container_id)

  container
    .append(text_box);

  return container;
}

var create_horizontal_container = function(){
  var h_container = $('<div class="horizontal container">');
  var a_container = create_simple_container();
  var v_divider = $('<div class="vertical divider">');
  var b_container = create_simple_container();

  h_container.attr('id', ++container_id);
  a_container.addClass('a');
  b_container.addClass('b');

  h_container
    .append(a_container)
    .append(v_divider)
    .append(b_container)
    .append(clear_div())

  return h_container;
}

var create_vertical_container = function(){
  var v_container = $('<div class="vertical container">');
  var a_container = create_simple_container();
  var h_divider = $('<div class="horizontal divider">');
  var b_container = create_simple_container();

  v_container.attr('id', ++container_id);
  a_container.addClass('a');
  b_container.addClass('b');

  v_container
    .append(a_container)
    .append(clear_div())
    .append(h_divider)
    .append(clear_div())
    .append(b_container)
    .append(clear_div())

  return v_container;
}


// helper methods
var get_parent = function(container){
  return $(container.parent('.container'));
}

var get_siblings = function(container){
  var children = container.children('.container')
  var c = {};
  c.a = $(children[0]);
  c.b = $(children[1]);
  return c;
}

var get_other_sibling = function(container){
  var parent = get_parent(container);
  var siblings = get_siblings(parent);
  var other_sibling = container.hasClass('a') ? siblings.b : siblings.a;
  return other_sibling
}

var get_properties = function(c){
  var container = {}
  container.jq = c;

  container.position = container.jq.hasClass('b') ? 'b' : 'a';
  container.width       = parseInt(container.jq.css("width"));
  container.height      = parseInt(container.jq.css("height"));
  container.min_width   = parseInt(container.jq.css("min-width"));
  container.append_new_width = (container.width - 20) / 2;
  container.remove_new_width = (container.width * 2) + 20;

  return container;
}

var resize_container = function(width, container){
  console.log('initial: ' + container.attr('class'));
  console.log(container)

  if (container.hasClass("simple")) {
    console.log('simple');
    var c_width = parseInt(container.css("width"));
    var new_width = c_width + width + 20;
    container.css("width", new_width);

  } else if (container.hasClass("horizontal")) {
    console.log('horizontal')
    var h_width = (width - 20) / 2;
    $.each(container.children('.container'), function(index, i_container){
      resize_container(h_width, $(i_container))
    });

  } else if (container.hasClass("vertical")) {
    console.log('vertical')
    $.each(container.children('.container'), function(index, i_container){
      resize_container(width, $(i_container));
    })
  } else {
    console.log("fuck: resize_container")
  }
}

var run_tests = function(){

  // a horizontal or vertical container does not have two children
  $.each($('.horizontal.container, .vertical.container'), function(index, container){
    if($(container).children('.container').length != 2){
      alert('a complex container has the wrong number of children!');
    }
  });

  // a horizontal or vertical container has two children with the same position
  $.each($('.horizontal.container, .vertical.container'), function(index, container){
    if(($(container).children('.a').length == 2) || ($(container).children('.b').length == 2)){
      alert('a complex container has two a or two b chilren!');
    }
  });

  // B before A
  $.each($('.horizontal.container, .vertical.container'), function(index, container){
    var children = $(container).children('.container')
    if($(children[0]).hasClass('b') || $(children[1]).hasClass('a') ){
      alert('a complex container has its chilren out of order');
    }
  });

  // missing a divider
  $.each($('.horizontal.container, .vertical.container'), function(index, container){
    if($(container).children('.divider').length == 0){
      alert('a complex container is missing a divider');
    }
  });
}

// actions + events
var additive = function(button, container){
  var new_container_type = (button == 'up' || button == 'down') ? 'vertical' : 'horizontal'
  var original_container_position = (button == 'right' || button == 'down') ? 'a' : 'b';

  var original_container  = {};
  original_container.jq   = container;
  original_container._    = get_properties(original_container.jq);

  if ((new_container_type == 'vertical') || (original_container._.append_new_width >= original_container._.min_width)){
    var new_container = {};
    new_container.jq = (new_container_type == 'vertical') ? create_vertical_container() : create_horizontal_container();
    new_container.original = original_container
      .jq.clone().
      removeClass('a b').addClass(original_container_position)
      .removeAttr('width');
    new_container.sibling = get_siblings(new_container.jq);

    // swap in original container
    new_container.sibling[original_container_position].replaceWith(new_container.original);
    new_container.sibling = get_siblings(new_container.jq);

    // set new_containers position
    new_container.jq.addClass(original_container._.position);

    // set sibling properties
    var sibling_width = (new_container_type == 'vertical') ? 'width' : 'append_new_width';
    new_container.sibling.a.css('width', original_container._[sibling_width]);
    new_container.sibling.b.css('width', original_container._[sibling_width]);

    // replace original_container with h_container
    original_container.jq.replaceWith(new_container.jq);

    run_tests();
    fixSquarePosition();
    // simple_container_events();
  }
}

var remove_container = function(container){
  var original_container = {};
  original_container.jq  = container;
  original_container._   = get_properties(original_container.jq);

  var parent_container  = {};
  parent_container.jq   = get_parent(original_container.jq);
  parent_container._    = get_properties(parent_container.jq);
  parent_container.other_position = (original_container._.position == 'a') ? 'b' : 'a';
  parent_container.sibling = get_siblings(parent_container.jq);

  // other_container
  var other_container = {};
  other_container.jq  = parent_container.sibling[parent_container.other_position];
  other_container._   = get_properties(other_container.jq);

  // set new position
  other_container.jq.removeClass('a b').addClass(parent_container._.position);

  // set new width
  if(parent_container.jq.hasClass('horizontal')){
    resize_container(original_container._.width, other_container.jq);
  }

  // replace parent container (H or V) with the other sibling container
  parent_container.jq.replaceWith(other_container.jq);
  run_tests()
}

var events = function(){

  var page_events = function(){
    $('#page').mouseup(function(){
      $('#page').unbind('mousemove');
      $('.triangle_on').removeClass('triangle_on');
    });

    $('#page').mouseup(function(){
      $('.values').hide();
    });

    $(window).resize(fixSquarePosition);
  }();

  var simple_container_events = function(){
    $('.simple.container').live('mouseover', function(){
    });

    $('.simple.container').live('mouseout', function(){
      $('.buttons').hide();
    });

    $('.simple.container.ce').live('mouseover', function(d){
      $('.header').removeClass('hover');
      $('.header', this).addClass('hover');
      $('.square').hide();
      $('.square', this).show();


      var box = $(this);
      $('.bin-width input').val(box.width() + 'px');
      $('.bin-height input').val(box.height() + 'px');
    });
  }();

  var box_events = function(){ 

    // box
    $('.box').live('mouseover', function(){
    });

    $('.box').live('mouseout', function(){
    });

    $('.box').live('click', function(d){
      var click = {};
      click.y = d.pageY;
      click.x = d.pageX;

      var box = {};
      box.jq = $(this);
      box.offset = box.jq.offset();
      box.y = box.offset.top;
      box.x = box.offset.left;
      box.width = parseInt(box.jq.css('width'));
      box.height = parseInt(box.jq.css('height'));
      box.o = {};
      box.o.x = box.width / 2 + box.x;
      box.o.y = box.height /2 + box.y;

      // corrected values
      click.pos = {};
      click.pos.x = click.x - box.o.x;
      click.pos.y = box.o.y - click.y;

      // regions
      if        ((click.pos.y > 0) && (click.pos.y > (box.height / box.width) * Math.abs(click.pos.x))) {
        // console.log('region 1');
      } else if ((click.pos.x > 0) && (click.pos.x > (box.height / box.width) * Math.abs(click.pos.y))) {
        // console.log('region 2');
      } else if ((click.pos.y < 0) && (click.pos.y < (box.height / box.width) * Math.abs(click.pos.x))) {
        // console.log('region 3');
      } else if ((click.pos.x < 0) && (click.pos.x < (box.height / box.width) * Math.abs(click.pos.y))) {
        // console.log('region 4');
      } else {
        // console.log('shit');
      }

      // console.log('click: ' + click.y + " " + click.x);
      // console.log('box: ' + box.y + " " + box.x);
      // console.log('box: ' + box.width + " " + box.height);
      // console.log('box o: ' + box.o.x + " " + box.o.y)
      // console.log('click c: ' + click.pos.x + " " + click.pos.y)
    })

    $('.box').live('mouseup', function(){
      if ($('#page[mode="box"]')) {
        $(this).find('.content').focus();
      }
    });

    // content
    $('.body .content').live('mouseup', function(){
      var sel = window.getSelection();
      text_selection = !sel.isCollapsed 
        ? {anchorNode: sel.anchorNode, anchorOffset: sel.anchorOffset, focusNode: sel.focusNode, focusOffset: sel.focusOffset} 
        : null;
      
      selectSpans();

      return false;
    });
    
    $('.body .content').live('mousedown', function(){
      if(selected_elements != null) {
       selected_elements.removeClass('hl-selected'); 
       selected_elements = null
      }
    })

    $('.body .content').live('keyup', function(e){
      editorTests();
    });

    // header / menubar
    $('.header').live('mouseover', function(){
      $('.buttons, .remove').hide();
      $('.buttons, .remove', this).show();

      $('.header').removeClass('hover');
      $(this).addClass('hover');
    });

    $('.header').live('mouseout', function(){
      $('.buttons, .remove', this).hide();
      $('.header').removeClass('hover');
    });

    // container & boxes
    $('.button').live('click', function(){
      direction = $(this).attr('class').split(" ")[0];
      additive(direction, $(this).closest('.container'))
    });

    $('.remove').live('click', function(){
      if($('.box').length > 1){
        remove_container($(this).closest('.container'));
      }
    });

    // squares
    $('.square.bottom').live('mousedown',function(d){

      var triangle_y_position = d.pageY;
      var triangle_x_position = d.pageX;

      var body = $(this).closest('.body');
      var body_height = parseInt(body.css('height'));
      var body_width = parseInt(body.css('width'));

      var right_square = body.find('.square.right');
      var left_square = body.find('.square.left');
      var bottom_square = body.find('.square.bottom');

      var buffer_y_position = triangle_y_position - body_height;
      var buffer_x_position = triangle_x_position - body_width;

      $('*').addClass('transparent_selection');

      $('#page').bind('mousemove', function(e){
        var current_y_position = e.pageY;
        var current_x_position = e.pageX;

        var old_height = body_height;
        // var old_width = body_width;

        body_height = current_y_position - buffer_y_position;
        // body_width = current_x_position - buffer_x_position;

        body.css('min-height', body_height)

        left_square.css('top', body_height / 2);
        right_square.css('top', body_height / 2);
        bottom_square.css('right', body_width / 2);
        // container.css('width', body_width);
        // resize_container((body_width - old_width), other_container)
        // console.log((body_height - old_height) + " " + (body_width - old_width))


      });
    });

    $('.square.bottom').live('mouseup',function(d){
      $('*').removeClass('transparent_selection');
      console.log('nay');
    })

    $('.square').live('mouseover', function(){
      $(this).css('background-color', '#8eb4e3')
    });

    $('.square').live('mouseout', function(){
      $('.square').css('background-color', '#fff')
    });
  }();

}


var fixSquarePosition = function(){
  $('.simple.container').each(function(){
    var container = $(this);
    var squares = container.find('.square');

    squares.filter('.left').css('top', container.height() / 2);
    squares.filter('.right').css('top', container.height() / 2);
    squares.filter('.bottom').css('right', container.width() / 2);
  })
}
