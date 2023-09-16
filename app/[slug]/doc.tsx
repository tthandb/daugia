'use client'
import React, { useEffect } from 'react'
import mammoth from 'mammoth'

function Doc({ uri = '' }: { uri: string }) {
  // useEffect(() => {
  //   fetch(this.props.filePath)
  //     .then(function (response) {
  //       if (response.ok) {
  //         return response;
  //       } else {
  //         throw new Error(response);
  //       }
  //     })
  //     .then(async (blob) => {
  //       mammoth
  //         .convertToHtml(
  //           { arrayBuffer: await blob.arrayBuffer()},
  //           { includeDefaultStyleMap: true }
  //         )
  //         .then((result) => {
  //           this.setState({loading:false});
  //           const docEl = document.createElement("div");
  //           docEl.className = "document-container";
  //           docEl.innerHTML = result.value;
  //           document.getElementById("docx").innerHTML = docEl.outerHTML;
  //         })
  //         .catch((e) => {
  //           this.setState({error:e, loading:false});
  //           this.props.onError(e);
  //         })
  //         .done();
  //     })
  //     .catch((e) => {
  //       this.setState({error:e, loading:false});
  //       this.props.onError(e);
  //     });
  // }, [])
  return <></>
}

export default Doc
