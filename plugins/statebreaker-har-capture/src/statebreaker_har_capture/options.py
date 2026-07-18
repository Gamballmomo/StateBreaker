"""Strict options accepted by the HAR capture plugin."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator


class HarCaptureOptions(BaseModel):
    """Configuration for deterministic HAR normalization."""

    model_config = ConfigDict(extra="forbid", strict=True)

    filter_static_resources: bool = True
    infer_response_variables: bool = True
    setup_entry_indices: list[int] = Field(default_factory=list)
    state_probe_entry_indices: list[int] = Field(default_factory=list)
    strip_credentials: bool = False

    @model_validator(mode="after")
    def validate_role_indices(self) -> HarCaptureOptions:
        for option_name, indices in (
            ("setup_entry_indices", self.setup_entry_indices),
            ("state_probe_entry_indices", self.state_probe_entry_indices),
        ):
            if any(index < 0 for index in indices):
                raise ValueError(f"{option_name} must contain only non-negative indices")
            if len(indices) != len(set(indices)):
                raise ValueError(f"{option_name} must not contain duplicates")

        conflicts = sorted(
            set(self.setup_entry_indices).intersection(self.state_probe_entry_indices)
        )
        if conflicts:
            raise ValueError(
                "role index conflict: setup_entry_indices and state_probe_entry_indices "
                f"overlap at original entry indices {conflicts}"
            )
        return self
