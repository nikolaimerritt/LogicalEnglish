# Musts
## Syntax highlighting with TextMate
https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide

## Rules generating templates
As user is typing, mark all rules that do not match any template with warning (https://code.visualstudio.com/api/language-extensions/programmatic-language-features#provide-diagnostics)

Use Code Action (https://code.visualstudio.com/api/language-extensions/programmatic-language-features#possible-actions-on-errors-or-warnings) to allow user to generate single template from all warning-ed rules using LGG


# Extras
## Type checking
Treat "commonly used words" (e.g. asset, person, director, company) as types. If user writes type B in place of type A, and B ⊄ A, then give warning

User can specify subtypes:
```
the types include:
a director is a person
```
so that the template and rule
```
the templates are:
  *a person* has *an office*

the knowledge base is:
  A director has an office if 
    ...
```
does not give a warning
