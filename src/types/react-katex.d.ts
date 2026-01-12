declare module "react-katex" {
  import * as React from "react";

  export interface KatexProps {
    math: string;
    block?: boolean;
    errorColor?: string;
    renderError?: (error: unknown) => React.ReactNode;
    settings?: any;
  }

  export class InlineMath extends React.Component<KatexProps> {}
  export class BlockMath extends React.Component<KatexProps> {}
}
