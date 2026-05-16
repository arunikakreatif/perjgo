declare namespace google {
  namespace script {
    interface Runner {
      withSuccessHandler(handler: (result: any) => void): Runner;
      withFailureHandler(handler: (error: Error) => void): Runner;
      [key: string]: any;
    }
    const run: Runner;
  }
}
