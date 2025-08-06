"""ChessMate Cognitive Service - Configuration

This file contains the configuration for the ChessMate Cognitive Service,
managed by Pydantic for robust validation and type safety. It also includes
the logic for dynamically configuring the LLM provider.

Author: Vyaakar Labs <r.raajey@gmail.com>
Location: India
License: MIT
"""
import os
from typing import Optional, Dict, Any

from google.genai import types as genai_types
from pydantic_settings import BaseSettings, SettingsConfigDict
from google.adk.models.lite_llm import LiteLlm
from google.adk.models.google_llm import Gemini
import structlog

log = structlog.get_logger()

# Provider-specific configurations
PROVIDER_CONFIG: Dict[str, Dict[str, Any]] = {
    "ollama_chat": {
        "requires_api_base": True,
        "env_vars": {"OLLAMA_API_BASE": "ollama_api_base"},
        "model_prefix": "ollama_chat/",
    },
    "gemini": {
        "requires_api_base": False,
        "env_vars": {
            "GOOGLE_API_KEY": "google_api_key",
            "GOOGLE_GENAI_USE_VERTEXAI": "use_vertex_ai",
        },
        "model_prefix": "",
        "use_direct": True,
    },
    "gemini_litellm": {
        "requires_api_base": True,
        "env_vars": {
            "GEMINI_API_KEY": "gemini_api_key",
            "GEMINI_API_BASE": "gemini_api_base",
        },
        "model_prefix": "gemini/",
        "use_direct": False,
    },
}





class Settings(BaseSettings):
    """
    Defines all configuration settings for the application, loading from
    environment variables and a .env file.
    """
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    # Service URLs
    postgres_url: str
    mcp_toolbox_url: str = "http://genai-toolbox:5000"
    redis_url: str = "redis://redis:6379"

    # Timeouts and Resilience
    genai_toolbox_timeout: float = 5.0
    enable_caching: bool = True
    enable_fallbacks: bool = True

    # ADK and LLM Configuration
    llm_provider: str = "gemini"
    llm_model: str = "gemini-1.5-flash-latest"
    
    # Provider-specific settings
    ollama_api_base: Optional[str] = None
    google_api_key: Optional[str] = None
    use_vertex_ai: bool = False
    gemini_api_base: str = "https://generativelanguage.googleapis.com/v1beta"

    # Data Quality and Quarantine
    enable_data_quality_quarantine: bool = True
    quarantine_log_path: str = "data/quarantine.log"
    data_quality_threshold: float = 0.95

    @property
    def litellm_model(self) -> str:
        """Computes the full model string for LiteLLM."""
        provider_conf = PROVIDER_CONFIG.get(self.llm_provider, {})
        model_prefix = provider_conf.get("model_prefix", "")
        return f"{model_prefix}{self.llm_model}"

    @property 
    def direct_model(self) -> str:
        """Returns the model string for direct usage (Google ADK)."""
        return self.llm_model

    @property
    def use_direct_model(self) -> bool:
        """Determines if we should use direct model vs LiteLLM wrapper."""
        provider_conf = PROVIDER_CONFIG.get(self.llm_provider, {})
        return provider_conf.get("use_direct", False)


def configure_llm_provider(config: Settings):
    """
    Configures the environment for the selected LLM provider using a data-driven approach.
    """
    log.info("Configuring LLM provider.", provider=config.llm_provider)
    
    provider_conf = PROVIDER_CONFIG.get(config.llm_provider)
    
    if not provider_conf:
        log.warning("No specific LLM provider configuration found.", provider=config.llm_provider)
        return

    for env_var, setting_name in provider_conf.get("env_vars", {}).items():
        setting_value = getattr(config, setting_name, None)
        if setting_value is not None:
            if isinstance(setting_value, bool):
                os.environ[env_var] = "TRUE" if setting_value else "FALSE"
            else:
                os.environ[env_var] = str(setting_value)
            log.info(f"Set {env_var} for LLM provider.")
        else:
            log.warning(f"{config.llm_provider} provider selected, but {setting_name} is not set.")


def create_llm_model(config: Settings) -> Gemini | LiteLlm:
    """
    Factory function to create the appropriate LLM model instance.
    """
    if config.use_direct_model:
        log.info("Creating direct Gemini model.", model=config.direct_model)
        # This configuration is critical for enabling the ADK to handle tool calls.
        # It instructs the model to use any of the tools provided by the agent.
        generation_config = {
            "tool_config": {
                "function_calling_config": {
                    "mode": "any"
                }
            }
        }
        return Gemini(model=config.direct_model, generation_config=generation_config)
    else:
        log.info("Creating LiteLLM wrapper.", model=config.litellm_model)
        return LiteLlm(model=config.litellm_model)


settings = Settings()
