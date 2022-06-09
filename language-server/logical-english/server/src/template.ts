export interface Template {
	predicateName: string,
	argumentTypes: string[]
}

export function templateFromString(templateString: string): Template {
	const argumentRegex = /\*(?:a|an) (\w[\w|\s]+\w)\*/g;
	let matches: RegExpMatchArray | null;
	const argumentNames: string[] = [];
	let templateWithoutArguments = templateString;
	
	while ((matches = argumentRegex.exec(templateString)) != null) {
		let argName = matches[1];
		argName = argName.replace(/\s+/g, '_');
		argName = argName.toLowerCase();
		argumentNames.push(argName);
		
		templateWithoutArguments = templateWithoutArguments.replace(matches[0], "");
	}	
	templateWithoutArguments = templateWithoutArguments.trim();
	templateWithoutArguments = templateWithoutArguments.replace(/\s+/g, '_');

	return {
		predicateName: templateWithoutArguments,
		argumentTypes: argumentNames
	};
}