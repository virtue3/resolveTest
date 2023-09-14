import React from "react";
import { useQuery } from "@apollo/client";
import { GetEntityDocument } from "../__generated__/graphql";
import { Accordion, Stack } from "react-bootstrap";
import AccordionBody from "react-bootstrap/esm/AccordionBody";

export function EntityDisplayer(props: { id: string }) {
  const { loading, error, data } = useQuery(GetEntityDocument, {
    variables: { entityId: props.id },
  });

  if (props.id === "-1") {
    return null;
  }

  console.log("entity displayer!");

  if (loading) return <p>LOADING...</p>;
  if (error) return <p>Error - {error.message}</p>;

  return (
    <>
      <>
        <h3>Entity</h3>
      </>
      <p>
        {data?.entity?.name}:{data?.entity?.id}
      </p>
      <h3>Categories</h3>
      <Accordion defaultActiveKey="0">
        {data?.entity?.categories?.map((cat, index) => {
          return (
            <Accordion.Item eventKey={index.toString()}>
              <Accordion.Header>{cat?.name ?? null}</Accordion.Header>
              <AccordionBody>
                {cat?.attributes?.map((catAttribute) => {
                  return (
                    <Stack>
                      <Stack direction="horizontal" gap={3}>
                        {catAttribute?.name}{catAttribute?.attrVals ? " = " + catAttribute?.attrVals : null}
                      </Stack>
                    </Stack>
                  );
                })}
              </AccordionBody>
            </Accordion.Item>
          );
        }) ?? null}
      </Accordion>
    </>
  );
}
