import Util from './util.js';
import StringManager from './stringmanager.js';
import ContentManager from './contentmanager.js';
import ModalDialog from './modal.js';
import ServiceProvider from './serviceprovider.js';
import Parser from './parser.js';
import Latex from './latex.js';
import MathML from './mathml.js';
import CustomEditors from './customeditors.js';
import Configuration from './configuration.js';
import jsProperties from './jsvariables.js';
import Event from './event.js';
import Listeners from './listeners.js';
import IntegrationModel from './integrationmodel.js';

/**
 * Class representing MathType integration Core. This class is the integration entry point. Manages integration
 * initialization (services, languages), events, and the insertion of the formulas in the edititon area.
 *
 */
export default class Core {
    /**
     * Core class constructor. Admits a string containing the configurationjs service
     * which loads all JavaScript configuration generated in the backend. This file is needed
     * to instantiate the serviceProvider class (all services lives in the same path).
     */
    constructor() {
        /**
         * Language. Needed for accessibility and locales.
         * @type {string} language - 'en' by default.
         */
        this.language = 'en';
		/**
		 * Class to manage plugin locales.
		 * @type {StringManager}
		 */
		this.stringManager = new StringManager();
       /**
        * Edit mode. Admit 'images' and 'latex' values.
        * @type {string}
        */
       this.editMode = 'images';
	   /**
		* Modal dialog.
		* @type {ModalDialog}
	    */
	   this.modalDialog = null;
	   /**
		* Core custom editors. By default only chemistry editor.
        * @type {CustomEditors}
	    */
       this.customEditors = new CustomEditors();
       var chemEditorParams = {
           name : 'Chemistry',
           toolbar : 'chemistry',
           icon : 'chem.png',
           confVariable : 'chemEnabled',
           title: 'ChemType',
           tooltip: 'Insert a chemistry formula - ChemType' // TODO: Localize tooltip.
       }
	   this.customEditors.addEditor('chemistry', chemEditorParams);

	   /**
		* Environment properties. This object contains data about the integration platform.
		* @type {Object}
		* @property {string} editor - Editor name. Usually the HTML editor.
		* @property {string} mode - Save mode. Xml by default
		* @property {string} version - Plugin version.
	    */
	   this.environment = {};

	   /**
		* Edit properties. This object
		* @type {Object}
		* @property {boolean} isNewElement - Indicates if the edit formula is a new one or not.
		* @property {Img} temporalImage - Image of the formula edited. Null if the formula is a new one.
		* @property {Range} latexRange - LaTeX formula range.
		* @property {Range} range - Image range.
		* @property {string} editMode - Edition mode. Images by default.
	    */
	   this.editionProperties = {
			isNewElement : true,
			temporalImage : null,
			latexRange : null,
			range : null
       }
       /**
        * Integration model.
        * @type {IntegrationModel}
        */
       this.integrationModel = null;
       /**
        * ContentManager instance.
        * @type {ContentManager}
        */
       this.contentManager = null;
    }

    init(integrationPath) {
        this.load(integrationPath);
    }

    /**
     * Sets the integration model object.
     * @param {IntegrationModel} integrationModel
     */
    setIntegrationModel(integrationModel) {
        this.integrationModel = integrationModel;
    }

	/**
	 * This method set an object containing environment properties. The structure for the an
	 * environment object is the following:
	 * - editor - Integration editor (normally the HTML editor).
	 * - mode - Save mode.
	 * - version - Plugin version.
	 * @param {object} environmentObject - And object containing environment properties.
	 */
	setEnvironment(environmentObject) {
		if ('editor' in environmentObject) {
			this.environment.editor = environmentObject.editor;
		}
		if ('mode' in environmentObject) {
			this.environment.mode = environmentObject.mode;
		}
		if ('version' in environmentObject) {
			this.environment.version = environmentObject.version;
		}
	}

    /**
     * Get modal dialog
     * @returns {ModalDialog} Modal Window core instance.
     */
    getModalDialog() {
        return this.modalDialog;
    }

    /**
     * Returns core.js path. Needed to load resources like CSS.
	 * @returns {string} - core.js absolute path.
     */
    getCorePath() {
        var scriptName = "core/core.js";
        var col = document.getElementsByTagName("script");
        for (var i = 0; i < col.length; i++) {
            var d;
            var src;
            d = col[i];
            src = d.src;
            var j = src.lastIndexOf(scriptName);
            if (j >= 0) {
                // That's my script!
                return src.substr(0, j - 1);
            }
        }
    }

    /**
     * This method inits the Core class doing the following:
     *
     * Calls (async) to configurationjs service, converting the response JSON into javascript variables
     * Once the configurationjs has been loaded
     * @ignore
     */
    load(integrationPath) {
        var httpRequest = typeof XMLHttpRequest != 'undefined' ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
        this.integrationPath = integrationPath.indexOf("/") == 0 || integrationPath.indexOf("http") == 0 ? integrationPath : Util.concatenateUrl(this.getCorePath(), integrationPath);
        httpRequest.open('GET', this.integrationPath, false);
        // Async request.
        httpRequest.onload = function (e) {
            if (httpRequest.readyState === 4) {
                // Loading configuration variables.
                var jsonConfiguration = JSON.parse(httpRequest.responseText);
                var variables = Object.keys(jsonConfiguration);
				Configuration.addConfiguration(jsonConfiguration);
				// Adding JavaScript (not backend) configuration variables.
				Configuration.addConfiguration(jsProperties);
                // Load service paths.
                this.loadServicePaths();
                // Load lang file.
                this.loadLangFile();
				this.loadCSS();
				// this.loadCustomConfiguration();
                // Fire 'onLoad' event. All integration must listen this event in order to know if the plugin has been properly loaded.
                Core.listeners.fire('onLoad', {});
            }
        }.bind(this);
        httpRequest.send(null);
    }

    /**
     * Instantiate a new ServiceProvider path (static) and calculate all the backend services
     * paths using Core integrationPath as base path.
     */
    loadServicePaths() {
        // Services path (tech dependant).
        var createImagePath = this.integrationPath.replace('configurationjs', 'createimage');
        var showImagePath = this.integrationPath.replace('configurationjs', 'showimage');
        var createImagePath = this.integrationPath.replace('configurationjs', 'createimage');
        var getMathMLPath = this.integrationPath.replace('configurationjs', 'getmathml');
        var servicePath = this.integrationPath.replace('configurationjs', 'service');

        // Some backend integrations (like Java o Ruby) have an absolute backend path,
        // for example: /app/service. For them we calculate the absolute URL path, i.e
        // protocol://domain:port/app/service
        if (this.integrationPath.indexOf("/") == 0) {
            var serverPath = this.getServerPath();
            showImagePath = serverPath + showImagePath;
            createImagePath = serverPath + createImagePath;
            getMathMLPath = serverPath + getMathMLPath;
            servicePath = serverPath + servicePath;
        }

        ServiceProvider.setServicePath('showimage', showImagePath);
        ServiceProvider.setServicePath('createimage', createImagePath);
        ServiceProvider.setServicePath('service', servicePath);
        ServiceProvider.setServicePath('getmathml', getMathMLPath);
	}

    /**
     * Get the base URL (i.e the URL on core.js lives).
     * @ignore
     */
    getServerPath() {
        var url = _wrs_corePath;
        var hostNameIndex = url.indexOf("/", url.indexOf("/") + 2);
        return url.substr(0, hostNameIndex);
    }

    /**
     * Loads language file using core.js as relative path.
     * @ignore
     */
    loadLangFile() {
        // Translated languages.
        var languages = 'ar,ca,cs,da,de,en,es,et,eu,fi,fr,gl,he,hr,hu,it,ja,ko,nl,no,pl,pt,pt_br,ru,sv,tr,zh,el';
        Core.stringManager = new StringManager();

        var langArray = languages.split(',');
        var lang = this.language;

        if (langArray.indexOf(lang) == -1) {
            lang = lang.substr(0, 2);
        }

        if (langArray.indexOf(lang) == -1) {
            lang = 'en';
        }

        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = this.getCorePath() + "/lang/" + lang + "/strings.js";
        // When strings are loaded, it loads into stringManager
        script.onload = function () {
            Core.getStringManager().loadStrings(wrs_strings);
            // Unseting global language strings array to prevent access.
        };
        document.getElementsByTagName('head')[0].appendChild(script);
    }

    loadCSS() {
        var fileRef = document.createElement("link");
        fileRef.setAttribute("rel", "stylesheet");
        fileRef.setAttribute("type", "text/css");
        fileRef.setAttribute("href", Util.concatenateUrl(this.getCorePath(), '/core/modal.css'));
        document.getElementsByTagName("head")[0].appendChild(fileRef);
    }

    /**
     * Add a plugin listener.
     * @param {object} listener
     */
    static addListener(listener) {
		Core.listeners.add(listener);
    }

    /**
     * Inserts or modifies formulas in a specified target.
     * @param {object} focusElement Element to be focused
     * @param {object} windowTarget Window where the editable content is
     * @param {string} mathml Mathml code
     * @param {object} wirisProperties Extra attributes for the formula (like background color or font size).
     * @param {string} editMode Current edit mode.
     * @ignore
     */
    updateFormula(focusElement, windowTarget, mathml, wirisProperties, editMode) {
        // Before update listener.
        // Params on beforeUpdate listener
        // - mathml
        // - editMode (read only)
        // - wirisProperties
        // - language (read only).
        var e = new Event();

        e.mathml = mathml;

        // Cloning wirisProperties object
        // We don't want wirisProperties object modified.
        e.wirisProperties = {};

        for (var attr in wirisProperties) {
            e.wirisProperties[attr] = wirisProperties[attr];
        }

        // Read only.
        e.language = this.language;
        e.editMode = editMode;

        if (Core.listeners.fire('onBeforeFormulaInsertion', e)) {
            return;
        }

        mathml = e.mathml;
        wirisProperties = e.wirisProperties;

        // Setting empty params for after.
        e = new Event();
        e.editMode = editMode;
        e.windowTarget = windowTarget;
        e.focusElement = focusElement;

        if (mathml.length == 0) {
            this.insertElementOnSelection(null, focusElement, windowTarget);
        }
        else if (editMode == 'latex') {
            e.latex = Latex.getLatexFromMathML(mathml);
            // wrs_int_getNonLatexNode is an integration wrapper to have special behaviours for nonLatex.
            // Not all the integrations have special behaviours for nonLatex.
            if (typeof wrs_int_getNonLatexNode != 'undefined' && (typeof e.latex == 'undefined' || e.latex == null)) {
                wrs_int_getNonLatexNode(e, windowTarget, mathml);
            }
            else {
                e.node = windowTarget.document.createTextNode('$$' + e.latex + '$$');
                Latex.cache.populate(e.latex, mathml);
            }
            this.insertElementOnSelection(e.node, focusElement, windowTarget);
        }
        else if (editMode == 'iframes') {
            var iframe = wrs_mathmlToIframeObject(windowTarget, mathml);
            this.insertElementOnSelection(iframe, focusElement, windowTarget);
        }
        else {
            e.node = Parser.mathmlToImgObject(windowTarget.document, mathml, wirisProperties, this.language);
            this.insertElementOnSelection(e.node, focusElement, windowTarget);
        }

        if (Core.listeners.fire('onAfterFormulaInsertion', e)) {
            return;
        }
    }

    /**
     * Replaces a selection with an element.
     * @param {object} element Element
     * @param {object} focusElement Element to be focused
     * @param {object} windowTarget Target
     * @ignore
     */
    insertElementOnSelection(element, focusElement, windowTarget) {
        if(typeof focusElement.frameElement !== 'undefined'){
            function get_browser(){
                var ua = navigator.userAgent;
                if(ua.search("Edge/") >= 0){
                    return "EDGE";
                }else if(ua.search("Chrome/") >= 0){
                    return "CHROME";
                }else if(ua.search("Trident/") >= 0){
                    return "IE";
                }else if(ua.search("Firefox/") >= 0){
                    return "FIREFOX";
                }else if(ua.search("Safari/") >= 0){
                    return "SAFARI";
                }
            }
            var browserName = get_browser();
            // Iexplorer, Edge and Safari can't focus into iframe
            if (browserName == 'SAFARI' || browserName == 'IE' || browserName == 'EDGE') {
                focusElement.focus();
            }else{
                focusElement.frameElement.focus();
            }
        }else{
            focusElement.focus();
        }

        if (this.editionProperties.isNewElement) {
            if (focusElement.type == "textarea") {
                Util.updateTextArea(focusElement, element.textContent);
            }
            else if (document.selection && document.getSelection == 0) {
                var range = windowTarget.document.selection.createRange();
                windowTarget.document.execCommand('InsertImage', false, element.src);

                if (!('parentElement' in range)) {
                    windowTarget.document.execCommand('delete', false);
                    range = windowTarget.document.selection.createRange();
                    windowTarget.document.execCommand('InsertImage', false, element.src);
                }

                if ('parentElement' in range) {
                    var temporalObject = range.parentElement();

                    if (temporalObject.nodeName.toUpperCase() == 'IMG') {
                        temporalObject.parentNode.replaceChild(element, temporalObject);
                    }
                    else {
                        // IE9 fix: parentNode() does not return the IMG node, returns the parent DIV node. In IE < 9, pasteHTML does not work well.
                        range.pasteHTML(Util.createObjectCode(element));
                    }
                }
            }
            else {
                var selection = windowTarget.getSelection();
                // We have use wrs_range beacuse IExplorer delete selection when select another part of text.
                if (this.editionProperties.range) {
                    var range = this.editionProperties.range;
                    this.editionProperties.range = null;
                }
                else {

                    try {
                        var range = selection.getRangeAt(0);
                    }
                    catch (e) {
                        var range = windowTarget.document.createRange();
                    }
                }
                selection.removeAllRanges();

                range.deleteContents();

                var node = range.startContainer;
                var position = range.startOffset;

                if (node.nodeType == 3) { // TEXT_NODE.
                    node = node.splitText(position);
                    node.parentNode.insertBefore(element, node);
                    node = node.parentNode;
                }
                else if (node.nodeType == 1) { // ELEMENT_NODE.
                    node.insertBefore(element, node.childNodes[position]);
                }
                // Fix to set the caret after the inserted image.
                range.selectNode(element);
                // Integration function.
                // If wrs_int_setCaretPosition function exists on
                // integration script can call caret method from the editor instance.
                // With this method we can call proper specific editor methods which in some scenarios
                // help's MathType to set caret position properly on the current editor window.
                if (typeof wrs_int_selectRange != 'undefined') {
                    wrs_int_selectRange(range);
                }
                // Selection collapse must have to do it after the function 'wrs_int_selectRange' because
                // can be that the range was changed and the selection needs to be updated.
                position = range.endOffset;
                selection.collapse(node, position);
            }
        }
        else if (this.editionProperties.latexRange) {
            if (document.selection && document.getSelection == 0) {
                this.editionProperties.isNewElement = true;
                this.editionProperties.latexRange.select();
                this.insertElementOnSelection(element, focusElement, windowTarget);
            }
            else {
                var parentNode = this.editionProperties.latexRange.startContainer;
                this.editionProperties.latexRange.deleteContents();
                this.editionProperties.latexRange.insertNode(element);
            }
        }
        else if (focusElement.type == "textarea") {
            var item;
            // Wrapper for some integrations that can have special behaviours to show latex.
            if (typeof wrs_int_getSelectedItem != 'undefined') {
                item = wrs_int_getSelectedItem(focusElement, false);
            }
            else {
                item = wrs_getSelectedItemOnTextarea(focusElement);
            }
            Util.updateExistingTextOnTextarea(focusElement, element.textContent, item.startPosition, item.endPosition);
        }
        else {
            if (!element) { // Editor empty, formula has been erased on edit.
				this.editionProperties.temporalImage.parentNode.removeChild(this.editionProperties.temporalImage);
            }
            this.editionProperties.temporalImage.parentNode.replaceChild(element, this.editionProperties.temporalImage);
        }
        function placeCaretAfterNode(node) {
            if (typeof window.getSelection != "undefined") {
                var range = windowTarget.document.createRange();
                range.setStartAfter(node);
                range.collapse(true);
                var selection = windowTarget.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
        placeCaretAfterNode(element);
    }

    /**
     * Opens a new modal dialog.
     * @param {string} language Language code for the editor
     * @param {object} target The editable element
     * @param {boolean} isIframe Specifies if the target is an iframe or not
     * @param {boolean} isModal Specifies if the target is a modal window or not
     * @return {object} The opened window
     * @ignore
     */
    openModalDialog(language, target, isIframe) {
        this.editMode = 'images';

        try {
            if (isIframe) {
                var selection = target.contentWindow.getSelection();
                this.editionProperties.range = selection.getRangeAt(0);
            } else {
                var selection = getSelection();
                this.editionProperties.range = selection.getRangeAt(0);
            }
        } catch (e) {
            this.editionProperties.range = null;
        }

        if (isIframe === undefined) {
            isIframe = true;
        }

        this.editionProperties.latexRange = null;

        if (target) {
            var selectedItem;
            // TODO: Selection wrapper / Integration wrapper
            if (typeof wrs_int_getSelectedItem != 'undefined') {
                selectedItem = wrs_int_getSelectedItem(target, isIframe);
            } else {
                selectedItem = Util.getSelectedItem(target, isIframe);
            }

            // Check LaTeX if and only if the node is a text node (nodeType==3).
            if (selectedItem != null && selectedItem.node.nodeType == 3) {
                // We try to figure out if we are editing a LaTeX node.
                var latexResult = Latex.getLatexFromTextNode(selectedItem.node, selectedItem.caretPosition);

                if (latexResult != null) {
                    this.editMode = 'latex';

                    var mathml = Latex.getMathMLFromLatex(latexResult.latex);
                    this.editionProperties.isNewElement = false;

					this.editionProperties.temporalImage = document.createElement('img');

                    this.editionProperties.temporalImage.setAttribute(Configuration.get('imageMathmlAttribute'), MathML.safeXmlEncode(mathml));
                    var windowTarget = isIframe ? target.contentWindow : window;

                    if (document.selection) {
                        var leftOffset = 0;
                        var previousNode = latexResult.startNode.previousSibling;

                        while (previousNode) {
                            leftOffset += Util.getNodeLength(previousNode);
                            previousNode = previousNode.previousSibling;
                        }

                        this.editionProperties.latexRange = windowTarget.document.selection.createRange();
                        this.editionProperties.latexRange.moveToElementText(latexResult.startNode.parentNode);
                        this.editionProperties.latexRange.move('character', leftOffset + latexResult.startPosition);
                        this.editionProperties.latexRange.moveEnd('character', latexResult.latex.length + 4); // Plus 4 for the '$$' characters.
                    } else {
                        this.editionProperties.latexRange = windowTarget.document.createRange();
                        this.editionProperties.latexRange.setStart(latexResult.startNode, latexResult.startPosition);
                        this.editionProperties.latexRange.setEnd(latexResult.endNode, latexResult.endPosition);
                    }
                }
            }
        }
        // The backend send the default editor attributes in a coma separated with the following structure:
        // key1=value1,key2=value2...
        var defaultEditorAttributesArray = Configuration.get('editorAttributes').split(", ");
        var defaultEditorAttributes = {};
        for (var i = 0, len = defaultEditorAttributesArray.length; i < len; i++) {
            var tempAtribute = defaultEditorAttributesArray[i].split('=');
            var key = tempAtribute[0];
            var value = tempAtribute[1];
            defaultEditorAttributes[key] = value;
        }
        // Here we need to concatenate the editorAtributes with the editorParameters
        var editorAttributes = {};
        Object.assign(editorAttributes, defaultEditorAttributes, Configuration.get('editorParameters'));
        editorAttributes.language = this.language;

        var contentManagerAttributes = {}
        contentManagerAttributes.editorAttributes = editorAttributes;
        contentManagerAttributes.language = this.language;
        contentManagerAttributes.customEditors = this.customEditors;
        contentManagerAttributes.environment = this.environment;

        if (this.modalDialog == null) {
            this.modalDialog = new ModalDialog(editorAttributes);
            this.contentManager = new ContentManager(contentManagerAttributes);
            // When an instance of ContentManager is created we need to wait until the ContentManager is ready
            // by listening 'onLoad' event
			var listener = Listeners.newListener(
                'onLoad',
                function() {
                    this.contentManager.isNewElement = this.editionProperties.isNewElement;
                    if (this.editionProperties.temporalImage != null) {
                        var mathML = MathML.safeXmlDecode(this.editionProperties.temporalImage.getAttribute(Configuration.get('imageMathmlAttribute')));
                        this.contentManager.mathML = mathML;
                    }
                }.bind(this)
            );
			this.contentManager.addListener(listener);
            this.contentManager.init();
            this.modalDialog.setContentManager(this.contentManager);
            this.contentManager.setModalDialogInstance(this.modalDialog);
        } else {
			this.contentManager.isNewElement = this.editionProperties.isNewElement;
			if (this.editionProperties.temporalImage != null) {
				var mathML = MathML.safeXmlDecode(this.editionProperties.temporalImage.getAttribute(Configuration.get('imageMathmlAttribute')));
				this.contentManager.mathML = mathML;
			}
        }
        this.contentManager.setIntegrationModel(this.integrationModel);
		this.modalDialog.open();
    }

    /**
     * Get the Core instance of the ServiceProvider class.
     * @returns {ServiceProvider} ServiceProvider instance.  .
     */
    static getServiceProvider() {
        return Core.serviceProvider;
    }

    /**
     * Get Core StringManager class.
     * @returns {StringManager} StringManager instance
     */
    static getStringManager() {
        return Core.stringManager;
    }

    /**
     * Adds iframe events.
     * @param {object} iframe Target
     * @param {function} doubleClickHandler Function to run when user double clicks the iframe
     * @param {function} mousedownHandler Function to run when user mousedowns the iframe
     * @param {function} mouseupHandler Function to run when user mouseups the iframe
     */
    addIframeEvents(iframe, doubleClickHandler, mousedownHandler, mouseupHandler) {
        Util.addElementEvents(iframe.contentWindow.document,
            function (element, event) {
                doubleClickHandler(element, event);
            },
            function (element, event) {
                mousedownHandler(element, event);
            },
            function (element, event) {
                mouseupHandler(element, event);
            }
        );
    }

    /**
     * Adds textarea events.
     * @param {object} textarea Target
     * @param {function} clickHandler Function to run when user clicks the textarea.
     */
    addTextareaEvents(textarea, clickHandler) {
        if (clickHandler) {
            Util.addEvent(textarea, 'click', function (event) {
                var realEvent = (event) ? event : window.event;
                clickHandler(textarea, realEvent);
            });
        }
    }

    /**
     * Return an object with all custom editors.
     */
    getCustomEditors() {
        return this.customEditors;
    }
}
 /**
* Plugin listeners
* @type {Array}
* @description Array containing pluginListeners
*/
Core.listeners = new Listeners();