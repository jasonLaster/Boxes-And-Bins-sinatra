// Magic Editor

var left_buffer = null;
var right_buffer = null;
var selected_elements = null;
var left_to_rt = null;
var cross_paragraph = null;
var cross_span = null;
var sel = null;


/* selectSpans takes a textselection, which is basically an anchor and focus node and offset
 * and converts the text selected into a list of selected elements and a left and right element I call a buffer
 * we can then see what styles the selected spans have, apply style transformations, or merge similar spans.
 */
var selectSpans = function() {

  editorTests();
  $('.content p span').attr('type', '');
  sel = text_selection;

  /* figure out the text selection focus and anchor
   * either the anchorNode is a paragraph or it is a span, in either case we've got it covered
   */
  var focus = null;
  var anchor = null;

  if (sel.anchorNode.nodeName != "P") {
    focus = {node: $(sel.focusNode.parentNode), offset: sel.focusOffset};
  } else {
    var focusNode = $(sel.focusNode.previousElementSibling.lastChild);
    var focusOffset = focusNode.text().length;
    focus = {node: focusNode, offset: focusOffset};
  }

  if (sel.focusNode.nodeName != "P") {
    anchor = {node: $(sel.anchorNode.parentNode), offset: sel.anchorOffset};
  } else {
    var anchorNode = $(sel.anchorNode.previousElementSibling.lastChild);
    var anchorOffset = anchorNode.text().length;
    anchor = {node: anchorNode, offset: anchorOffset};
  }

  /* next step is to convert the anchor and focus node into left_selection and right_selection.
	 * If the selection is from left to right, then the anchor is the left selection and the focus
	 * is the right selection. To figure out if the selection is left to right, we need to know if
	 * the selection crossed a paragraoh or a span.
	 *
	 * cross paragraph P1--a--P1P2--f--P2  or  P1--f--P1P2--a--P2 
	 * cross span      A--f---AB---a--B    or  A--a---AB---f--B
	 * neither         A--a--f--A          or A--f--a--A
	 * where A,B are spans, P1,P2 are paragraphs, and a is an anchor, and f is a focus
	 * 
   */

  cross_paragraph = $(anchor.node).parent().text() !== $(focus.node).parent().text();
  cross_span = ($(anchor.node).text() !== $(focus.node).text());

  if(cross_paragraph) {
    left_to_rt = (anchor.node.parent().index() < focus.node.parent().index());
  } else if (cross_span) {
    left_to_rt = $(anchor.node).index() < $(focus.node).index();
	} else {
		left_to_rt = (anchor.offset < focus.offset);
	}

  var left_selection  = left_to_rt ? anchor : focus;
  var right_selection = left_to_rt ? focus  : anchor;


  /* now that we know which was the left and right most selection
   * we can create a left or right buffer, if the left most selection is not at
   * the beginning of the span or the right most selection is not at the end of a span.
   */

   left_buffer = [];
   right_buffer = [];
   selected_elements = [];

  // left_buffer
  if (left_selection.offset != 0) {
    left_buffer = left_selection.node.clone();
    left_buffer.text(left_selection.node.text().substring(0, left_selection.offset));
    left_selection.node.before(left_buffer);
    left_buffer.attr('type' ,'left_buffer');
  }

  // right_buffer
  if (right_selection.offset != right_selection.node.text().length) {
    right_buffer = right_selection.node.clone();
    right_buffer.text(right_buffer.text().substring(right_selection.offset, right_buffer.text().length));
    right_selection.node.after(right_buffer);
    right_buffer.attr('type' ,'right_buffer');
  }


	/* now that we've created a left and right buffer, we need to trim the left and right selections.
	 * If the selection deos not cross a span, then the left and right selections are identical
	 * and they both may or may not be offsetted.  A--L---R--B => L--R
	 *
	 * If the selection crosses a span, then trim the left selection by removing the text 
	 * thats to the left of the selection and we trim the right selection by removing the text that's
	 * to the right of the selection. A--L--A...B--R--B => L--A ... B--R
	 *
	 */


  if (!cross_span) {
    left_selection.node.text(left_selection.node.text().substring(left_selection.offset, right_selection.offset));
  } else {
    left_selection.node.text(left_selection.node.text().substring(left_selection.offset, left_selection.offset + left_selection.node.text().length));
    right_selection.node.text(right_selection.node.text().substring(0, right_selection.offset));
	}



  /* Now that we've created a left and right buffer and trimmed the left and right selections, 
   * we can get to work figuring out all of the spans that were actually selected.
   * This is actually not that hard because we have the left and rightmost spans and we know if the selection
   * crossed any spans or paragraphs.
   */

  if (!cross_span) {
    selected_elements = left_selection.node;
  } 

	else if (!cross_paragraph) {
    selected_elements =
      left_selection.node.parent().children()
      .slice(left_selection.node.index(), right_selection.node.index() + 1);
  } 

	else {
    left_spans =
      left_selection.node.parent().children()
      .slice(left_selection.node.index(), left_spans.length);

    paragraphs =
      left_selection.node.parent().parent().children('p')
      .slice(left_selection.node.parent().index() + 1, right_selection.node.parent().index()).children('span');

    right_spans =
      right_selection.node.parent().children()
      .slice(0, right_selection.node.index() + 1);

    selected_elements = $.merge(left_spans, $.merge(paragraph_spans, right_spans));
  }


	/* Now that we have the selected elements, we can do whatever we like to them :)
	 * at this point, all that means is updating their type attribute to selected_elements, 
	 * and adding a class.
	 */

	selected_elements.attr('type' ,'selected_elements');
}




/* Merge Spans takes the left buffer, selected elements, and the right buffer
 * and goes from left to right trying to combine the spans that are similar. 
 * This is really important because otherwise, the spans will reduce to one character. 
 */

var _mergeSpans = function(span_attr) {

  /* We want to get all the spans for each paragraph.
   * If the selection spans multiple paragraphs, we'll have to split it up by paragraph. [[spans], [spans]]
   * 
   * We do this by: 
   * 1. get list of spans selected (all_spans)
   *   if cross_paragraph
   *   2. get list of paragraph indices 
   *   3. get list of spans for each paragraph [[spans], [spans]]
   */

  var all_spans = $($.merge($.merge($.merge([], left_buffer), selected_elements), right_buffer));

  if (cross_paragraph) {
    var paragraphs = _.uniq(_.map(all_spans, function(i){ 
      return $(i).parent().index() 
    }));

    all_spans = _.map(paragraphs, function(paragraph_index){
      return _.select(all_spans, function(span){
        return $(span).parent().index() == paragraph_index;
      });
    });
  } else {
    all_spans = Array(all_spans);
  }

  /* Now that we have all the spans organized by paragraph, 
   * We'll iterate through the paragraphs and combine similar spans. 
   */

  _.each(all_spans, function(spans){
    prev = $(spans[0]);
    for(var i = 1; i < spans.length; i++) {
      var current = $(spans[i]);
      if (prev.attr(span_attr) === current.attr(span_attr) || current.attr(span_attr) == '') {
        current.text(prev.text() + current.text());
        prev.remove();
			}
      prev = current;
    }
  });
}


var mergeSpans = function(){

  // get the spans in each paragraph
  var p_spans = [];
  var ps = $('.content p');  
  for (i = 0; i < ps.length; i++) p_spans[i] = $(ps[i]).children('span');

 
 // merge two spans that share the same type 
 for(var i=0; i<p_spans.length; i++) {
   var spans = p_spans[i];
   var prev = $(spans[0]);
   for(var j = 1; j < spans.length; j++) {
     var current = $(spans[j]);
     if (prev.attr('class') === current.attr('class') && prev.attr('type') === current.attr('type')) {
       current.text(prev.text() + current.text());
       prev.remove();
			}
     prev = current;
   }
 }

}


// TRANSFORMATIONS
var transformText = function(elements, oldClass, newClass) {
  _.each(elements, function(element){
    element.className = element.className.replace(oldClass, '');
  });

  $(elements).addClass(newClass);

  _.each(elements, function(element){
    element.className = element.className.replace(/\s{2,}/g,' ').replace(/^\s/,'');
  });

}

var changeColor = function(elements, color){
  var oldClass = new RegExp('color-\\w+', 'g');
  transformText(elements, oldClass, color);
}

var changeFontSize = function(elements, size){
  var oldClass = new RegExp('size-\\d+', 'g');
  var newClass = 'size-' + size;
  transformText(elements, oldClass, newClass);
}

var changeFontStyle = function(elements, style){
  var oldClass = new RegExp('style-font-\\w+', 'g');
  var newClass = 'style-font-' + style;
  transformText(elements, oldClass, newClass);
}


// TESTS
var selectSpanTests = function(){
  // run through all the model tests for both left and right directions
  // add in paragraphs and the introduction of multiple middle spans
  // should be 2 * 2 * 4 * (# of tests)

  // simple span
  var simple_span = $('<div class="content" contenteditable="true"><p><span>Testing 1 2 3...</span></p></div>');
}

var editorTests = function(){

  // proper heirarchy
  var proper_hierarchy = function(){
    var content_divs = $('.content[contenteditable="true"]');
    var p_elements = content_divs.children();
    var span_elements = p_elements.children();

    var empty_elements =
      _([content_divs, p_elements, span_elements])
        .any(function(i){return $(i).length == 0}
      );

    if (empty_elements) {
      return false;
    }

    function all_elements_are (elements, type){
      return _(elements).chain()
        .map(function(el){ return el.nodeName;})
        .all(function(el){ return el == type;})
        .value();
    }

    return all_elements_are(content_divs, 'DIV')
      && all_elements_are(p_elements, 'P')
      && all_elements_are(span_elements, 'SPAN');
  }

  if (!proper_hierarchy()) {
    console.log('content div hierarchy is blown. There are probably no spans!!!');

    // check to see if ps are missing spans
    $('.content').find('p').each(function() {
      if ($(this).html() == '<br>') {
        $(this).html('<span><br></span>');
        $(this).parent('.content').focus();
      }
    });

    // test to see if content is missing p children
    $('.content').each(function() {
      if ($(this).html() == '') {
        $(this).html('<p><span><br></span></p>');
        $(this).focus();
      }
    });
  }

}


var spanTests = function(){
  var s1 = $('<span>s1</span>');
  var s2 = $('<span type class="">s2</span>');
  var s3 = $('<span type class="">s3</span>');
  var s4 = $('<span type class="">s4</span>');
  
  var content = $('<div class="content" contenteditable="true"><p></p></div>');
  var initial_span = $('<span> <br> </span>');
  

  // print initial content
  var t1 = content.clone();
  t1.find('p').html(initial_span);
  console.log(t1.html());
  
  // want to test merge spans
  // create a bunch of spans and put them in different sequences. 
  // see if they merge correctly
  
  // also want to test Select Spans
  // need to break the method into different parts
  // the first will be weird (create an artificial selection) and see if we can create anchor and node elements
  // the second will be easier, create anchor and focus nodes to figure out cross_paragraph, cross_span, and left_to_rt
  // ...
  // all of these tests will require a couple corpii (spans and paragraphs organized in various ways)
  
}


// dependent on text_selection & selected_elements
var editor = function(type, param) {

  if (!text_selection  || selected_elements.length == 0) {
    console.warn('no text selection');
    return
  }

  switch (type) {
    case 'color':
      changeColor(selected_elements, param);
      break;
    case 'size':
      changeFontSize(selected_elements, param);
      break;
    case 'style':
      changeFontStyle(selected_elements, param);
      break;
  }
  
  $('.content p span').attr('type', '');
  mergeSpans();
}



var events = function(){

	$('.content').live('mouseup', function(){
    $('.content p span').attr('type', '');
	  var sel = window.getSelection();
	  text_selection = !sel.isCollapsed 
	    ? {anchorNode: sel.anchorNode, anchorOffset: sel.anchorOffset, focusNode: sel.focusNode, focusOffset: sel.focusOffset} 
	    : null;

    if(text_selection) selectSpans();
    mergeSpans();
	  return false;
	});


  $('.content').live('mousedown', function(){
		selected_elements = null;
  	$('.content p span').attr('type', '');
		return true;
  })


}


