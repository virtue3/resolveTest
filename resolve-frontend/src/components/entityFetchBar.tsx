import React, { useState } from "react";
import { EntityDisplayer } from "./entityDisplayer";
import { Container, Button, Col, Stack } from "react-bootstrap";

export function EntityFetchBar() {
  const [entityTempId, setEntityTempId] = useState("8862");
  const [entityId, setEntityId] = useState("-1");

  function handleTempChange(e: any) {
    setEntityTempId(e.target.value);
  }

  function handleButtonClick(e: any) {
    setEntityId(entityTempId);
  }

  return (
    <Container>
      <Stack gap={3}>
        <Container>
          <Stack direction="horizontal" gap={3}>
            <input value={entityTempId} onChange={handleTempChange} />
            <Button onClick={handleButtonClick}>Fetch</Button>
          </Stack>
        </Container>
        <Container>
        <EntityDisplayer id={entityId}></EntityDisplayer>
        </Container>
      </Stack>
    </Container>
  );
}
