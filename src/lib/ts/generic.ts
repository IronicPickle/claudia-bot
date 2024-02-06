import { Interaction } from "discordeno";

export type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

export type CommandOptions = Required<Required<Interaction>["data"]>["options"];

export type CommandOption = ArrayElement<CommandOptions>;

export type CommandValue = CommandOption["value"];
