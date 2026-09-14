// app/pages/Services.tsx
'use client';

import { FormEvent, useState } from 'react';
import { api } from '../utils/apiClient';
import { ZodError } from 'zod';
import {
  tradeInSchema,
  repairSchema,
  supportTicketSchema,
} from '../schemas/services';

interface ServicesProps {
  isAuthenticated: boolean;
  onNotification: (message: string) => void;
}

interface FormError {
  [key: string]: string;
}

export function Services({
  isAuthenticated,
  onNotification,
}: ServicesProps) {
  const [tradeInError, setTradeInError] = useState<FormError>({});
  const [repairError, setRepairError] = useState<FormError>({});
  const [supportError, setSupportError] = useState<FormError>({});

  const [tradeInLoading, setTradeInLoading] = useState(false);
  const [repairLoading, setRepairLoading] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);

  const handleTradeIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTradeInError({});
    setTradeInLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const validated = tradeInSchema.parse(data);
      await api('/services/trade-ins', {
        method: 'POST',
        body: JSON.stringify(validated),
      });
      e.currentTarget.reset();
      onNotification('Trade-in request submitted successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error instanceof ZodError) {
          const fieldErrors = error.flatten().fieldErrors;
          setTradeInError(
            Object.entries(fieldErrors).reduce(
              (acc, [key, msgs]) => ({
                ...acc,
                [key]: (msgs as string[])[0],
              }),
              {}
            )
          );
        } else {
          setTradeInError({ _general: error.message });
        }
      }
    } finally {
      setTradeInLoading(false);
    }
  };

  const handleRepair = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRepairError({});
    setRepairLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const validated = repairSchema.parse(data);
      await api('/services/repairs', {
        method: 'POST',
        body: JSON.stringify(validated),
      });
      e.currentTarget.reset();
      onNotification('Repair request submitted successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error instanceof ZodError) {
          const fieldErrors = error.flatten().fieldErrors;
          setRepairError(
            Object.entries(fieldErrors).reduce(
              (acc, [key, msgs]) => ({
                ...acc,
                [key]: (msgs as string[])[0],
              }),
              {}
            )
          );
        } else {
          setRepairError({ _general: error.message });
        }
      }
    } finally {
      setRepairLoading(false);
    }
  };

  const handleSupport = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSupportError({});
    setSupportLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const validated = supportTicketSchema.parse(data);
      await api('/services/tickets', {
        method: 'POST',
        body: JSON.stringify(validated),
      });
      e.currentTarget.reset();
      onNotification('Support ticket submitted successfully');
    } catch (error) {
      if (error instanceof Error) {
        if (error instanceof ZodError) {
          const fieldErrors = error.flatten().fieldErrors;
          setSupportError(
            Object.entries(fieldErrors).reduce(
              (acc, [key, msgs]) => ({
                ...acc,
                [key]: (msgs as string[])[0],
              }),
              {}
            )
          );
        } else {
          setSupportError({ _general: error.message });
        }
      }
    } finally {
      setSupportLoading(false);
    }
  };

  return (
    <section className="services-page page shell">
      <span className="kicker">LIFETIME SUPPORT</span>
      <h2>
        Everything after <em>checkout.</em>
      </h2>

      <div className="service-cards">
        <form onSubmit={handleTradeIn}>
          <b>01 / TRADE IN</b>
          <h3>Upgrade for less.</h3>

          <fieldset disabled={!isAuthenticated || tradeInLoading}>
            <label>
              Device model *
              <input
                type="text"
                name="deviceModel"
                required
                placeholder="e.g. iPhone 14 Pro"
                aria-label="Device model"
                aria-invalid={!!tradeInError.deviceModel}
              />
              {tradeInError.deviceModel && (
                <span className="field-error">{tradeInError.deviceModel}</span>
              )}
            </label>

            <label>
              Storage
              <input
                type="text"
                name="storage"
                placeholder="e.g. 256GB"
                aria-label="Storage"
              />
            </label>

            <label>
              Condition details *
              <textarea
                name="details"
                placeholder="Describe the device condition"
                required
                minLength={5}
                aria-label="Condition details"
                aria-invalid={!!tradeInError.details}
              />
              {tradeInError.details && (
                <span className="field-error">{tradeInError.details}</span>
              )}
            </label>

            <button type="submit" disabled={tradeInLoading}>
              {tradeInLoading ? 'Submitting…' : 'Request valuation →'}
            </button>
            {tradeInError._general && (
              <div className="form-error" role="alert">
                {tradeInError._general}
              </div>
            )}
          </fieldset>
        </form>

        <form onSubmit={handleRepair}>
          <b>02 / REPAIR</b>
          <h3>Get it working.</h3>

          <fieldset disabled={!isAuthenticated || repairLoading}>
            <label>
              Product reference *
              <input
                type="text"
                name="productReference"
                required
                placeholder="Serial number or order #"
                aria-label="Product reference"
                aria-invalid={!!repairError.productReference}
              />
              {repairError.productReference && (
                <span className="field-error">{repairError.productReference}</span>
              )}
            </label>

            <label>
              Describe the problem *
              <textarea
                name="problem"
                required
                minLength={10}
                placeholder="What's wrong with your device?"
                aria-label="Problem description"
                aria-invalid={!!repairError.problem}
              />
              {repairError.problem && (
                <span className="field-error">{repairError.problem}</span>
              )}
            </label>

            <button type="submit" disabled={repairLoading}>
              {repairLoading ? 'Submitting…' : 'Book a repair →'}
            </button>
            {repairError._general && (
              <div className="form-error" role="alert">
                {repairError._general}
              </div>
            )}
          </fieldset>
        </form>

        <form onSubmit={handleSupport}>
          <b>03 / SUPPORT</b>
          <h3>Talk to a human.</h3>

          <fieldset disabled={!isAuthenticated || supportLoading}>
            <label>
              Subject *
              <input
                type="text"
                name="subject"
                required
                minLength={5}
                placeholder="How can we help?"
                aria-label="Support subject"
                aria-invalid={!!supportError.subject}
              />
              {supportError.subject && (
                <span className="field-error">{supportError.subject}</span>
              )}
            </label>

            <label>
              Message *
              <textarea
                name="message"
                required
                minLength={10}
                placeholder="Tell us more..."
                aria-label="Support message"
                aria-invalid={!!supportError.message}
              />
              {supportError.message && (
                <span className="field-error">{supportError.message}</span>
              )}
            </label>

            <button type="submit" disabled={supportLoading}>
              {supportLoading ? 'Submitting…' : 'Open a ticket →'}
            </button>
            {supportError._general && (
              <div className="form-error" role="alert">
                {supportError._general}
              </div>
            )}
          </fieldset>
        </form>
      </div>

      <div className="service-links">
        <span>Warranty claims</span>
        <span>Returns & refunds</span>
        <span>Order tracking</span>
        <span>Device authenticity</span>
        <span>WhatsApp support</span>
      </div>
    </section>
  );
}
