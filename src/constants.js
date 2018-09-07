/**
 * This class represents all the constants needed in a MathType integration among different classes.+
 * If a constant should be used between different classes should be defined here using attribute accessors.
 */
export default class Constants {
    /**
     * Safe XML entities.
     */
    static get safeXmlCharactersEntities() {
        return {
            'tagOpener': '&laquo;',
            'tagCloser': '&raquo;',
            'doubleQuote': '&uml;',
            'realDoubleQuote': '&quot;'
        };
    }

    /**
     * Blackboard invalid safe characters.
     */
    static get safeBadBlackboardCharacters() {
        return {
            'ltElement': '«mo»<«/mo»',
            'gtElement': '«mo»>«/mo»',
            'ampElement': '«mo»&«/mo»'
        };
    }

    /**
     * Blackboard valid safe characters.
     */
    static get safeGoodBlackboardCharacters() {
        return {
            'ltElement': '«mo»§lt;«/mo»',
            'gtElement': '«mo»§gt;«/mo»',
            'ampElement': '«mo»§amp;«/mo»'
        }
    }
}
/**
 * Standard XML special characters.
 * @static
 */
Constants.xmlCharacters =
    {
        'tagOpener': '<',       // Hex: \x3C.
        'tagCloser': '>',       // Hex: \x3E.
        'doubleQuote': '"',     // Hex: \x22.
        'ampersand': '&',       // Hex: \x26.
        'quote': '\''           // Hex: \x27.
    }

/**
 * Safe XML special characters. This characters are used instead the standard
 * the standard to parse the  MathML if safeXML save mode is enable. Each XML
 * special character have a UTF-8 representation.
 * @static
 */
Constants.safeXmlCharacters =
    {
        'tagOpener': '«',       // Hex: \xAB.
        'tagCloser': '»',       // Hex: \xBB.
        'doubleQuote': '¨',     // Hex: \xA8.
        'ampersand': '§',       // Hex: \xA7.
        'quote': '`',           // Hex: \x60.
        'realDoubleQuote': '¨'
    }

