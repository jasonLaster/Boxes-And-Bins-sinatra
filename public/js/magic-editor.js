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
  

  $('content p span').attr('type', '');
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

  /* next step is to convert the anchor and focus node into left_selection and right_selection
   * check if the selection is cross_paragraph or cross_span and then based on that,
   * do one final check to see if the selection was left to right.
   */

  cross_paragraph = $(anchor.node).parent().text() !== $(focus.node).parent().text();
  cross_span = ($(anchor.node).text() !== $(focus.node).text());

  if(cross_paragraph) {
    left_to_rt = (anchor.node.parent().index() < focus.node.parent().index());
  } else {
    left_to_rt =
     cross_span
     ? ($(anchor.node).index() < $(focus.node).index())
     : (anchor.offset < focus.offset);
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
    right_buffer.text(right_buffer.text().substring(right_selection.offset, text.length));
    right_selection.node.after(right_buffer);
    right_buffer.attr('type' ,'right_buffer');
  }


  /* now that we've created a left and right buffer if needed, we can get to work
   * figuring out what the selected elements were. This is actually not that hard once we know
   * if the selection crossed a span or a paragraph. The strategy here will be to
   * merge together the left and right selections intelligently.
   */

  // trim the left & right selections if necessary
  if (!cross_span) {
    left_selection.node.text(left_selection.node.text().substring(left_selection.offset, right_selection.offset));
    selected_elements = left_selection.node;
  } else {
    left_selection.node.text(left_selection.node.text().substring(left_selection.offset, text.length));
    right_selection.node.text(right_selection.node.text().substring(0, right_selection.offset));

    if (!cross_paragraph) {
      // get all of the paragraphs spans and then
      // select all the spans inbetween the left and right span
      selected_elements =
        left_selection.node.parent().children()
        .slice(left_selection.node.index(), right_selection.node.index() + 1);
    } else {

      // get the left and right spans from their respective paragraphs
      // and then get all the spans from the inbetween paragraphs
      // once we have all the spans, we'll merge them together and call it selected_elements
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
  }
  selected_elements.attr('type' ,'selected_elements').addClass('hl-selected');
}

/* Merge Spans takes the left buffer, selected elements, and the right buffer
 * and goes from left to right trying to combine the spans that are similar. 
 * This is really important because otherwise, the spans will reduce to one character. 
 */

var mergeSpans = function() {

  /* We want to get all the spans for each paragraph.
   * If the selection spans multiple paragraphs, we'll have to split it up by paragraph. [[spans], [spans]]
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
      if (prev.attr('class') === current.attr('class')) {
        current.text(prev.text() + current.text());
        prev.remove();
      }
      prev = current;
    }
  });
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

// dependent on text_selection & selected_elements
var editor = function(type, param) {

  if (!text_selection) {
    console.log('fail');
    return
  }

  // selectSpans();

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

  mergeSpans();
}
