export default defineAppConfig({
  ui: {
    button: {
      slots: {
        base: 'rounded-full'
      },
      defaultVariants: {
        color: 'primary',
        variant: 'solid'
      },
      compoundVariants: [
        {
          color: 'primary',
          variant: 'solid',
          class: 'bg-brand-mustard hover:shadow-none hover:bg-brand-mustard active:bg-brand-orange text-brand-white shadow-[4px_5px_0px_0px] shadow-brand-green border-none transition-all'
        },
        {
          color: 'primary',
          variant: 'outline',
          class: 'bg-brand-white border border-brand-grey-light text-brand-grey-dark hover:bg-brand-cream shadow-none'
        },
        {
          color: 'neutral',
          variant: 'solid',
          class: 'active:bg-brand-grey-light bg-brand-white hover:bg-brand-cream text-brand-black ring-1 ring-inset ring-brand-grey-light shadow-none'
        },
        {
          color: 'neutral',
          variant: 'subtle',
          class: 'bg-brand-white hover:bg-brand-cream text-brand-black ring-1 ring-inset ring-brand-grey-light shadow-none'
        },
        {
          color: 'neutral',
          variant: 'ghost',
          class: 'bg-transparent hover:bg-brand-cream text-brand-black shadow-none'
        },
        {
          color: 'neutral',
          variant: 'outline',
          class: 'bg-brand-white border border-brand-grey-light text-brand-grey-dark hover:bg-brand-cream shadow-none'
        }
      ]
    },
    pageCard: {
      slots: {
        root: 'rounded-none bg-brand-white border-none shadow-[0.5rem_0.5rem_0_0_var(--color-brand-mustard),1rem_1rem_0_0_var(--color-brand-green)] ring-0',
        title: 'font-serif text-4xl font-bold text-brand-black',
        description: 'text-brand-grey-dark font-roboto text-base',
        footer: 'flex justify-between items-center w-full pt-6 mt-4 border-t border-brand-grey-light',
      },
      variants: {
        variant: {
          outline: {
            root: 'rounded-none bg-brand-white border-none shadow-[0.5rem_0.5rem_0_0_var(--color-brand-mustard),1rem_1rem_0_0_var(--color-brand-green)] ring-0',
          },
          completed: {
            root: 'rounded-none bg-brand-brown border-none shadow-none ring-0 text-brand-white',
            title: 'text-brand-white',
            description: 'text-brand-white/80',
            icon: 'text-brand-white',
            footer: 'flex justify-between items-center w-full pt-6 mt-4 border-t border-brand-white/30',
          },
        },
      },
    },
    timeline: {
      slots: {
        indicator: 'rounded-none bg-brand-green text-brand-white group-data-[state=completed]:text-brand-white group-data-[state=active]:text-brand-white',
        separator: 'rounded-none bg-brand-green group-data-[state=completed]:bg-brand-green',
      },
      variants: {
        color: {
          primary: {
            indicator: 'bg-brand-green group-data-[state=completed]:bg-brand-green group-data-[state=active]:bg-brand-green',
            separator: 'bg-brand-green group-data-[state=completed]:bg-brand-green group-data-[state=active]:bg-brand-green',
          },
        },
      },
      defaultVariants: {
        color: 'primary',
      },
    },
    avatar: {
      slots: {
        root: 'rounded-none',
      },
    },
    pricingPlan: {
      slots: {
        root: 'rounded-none bg-brand-white border-none shadow-[0.5rem_0.5rem_0_0_var(--color-brand-green),1rem_1rem_0_0_var(--color-brand-teal)] ring-0',
        title: 'text-brand-black font-serif text-2xl sm:text-4xl font-semibold',
        price: 'text-brand-black font-serif text-4xl sm:text-4xl font-semibold',
      },
      variants: {
        variant: {
          outline: {
            root: 'ring-0',
          },
        },
      },
      defaultVariants: {
        variant: 'outline',
      },
    },
    accordion: {
      slots: {
        root: 'w-full rounded-none bg-brand-white px-8 py-3 shadow-[0.5rem_0.5rem_0_0_var(--color-brand-teal),1rem_1rem_0_0_var(--color-brand-yellow)]',
        item: 'border-b border-brand-grey-light last:border-b-0',
        header: 'flex w-full',
        trigger: 'group flex-1 flex items-center justify-between gap-3 font-medium py-5 text-brand-black w-full text-left focus:outline-none',
        content: 'text-brand-grey-dark overflow-hidden',
        body: 'text-base pb-6 pt-1',
        leadingIcon: 'shrink-0 size-6 text-brand-green',
        trailingIcon: 'shrink-0 size-5 ms-auto group-data-[state=open]:rotate-180 transition-transform duration-200 text-brand-green',
        label: 'font-semibold text-base flex-1 text-left'
      }
    },
    slideover: {
      slots: {
        title: 'font-serif text-4xl font-bold text-brand-black',
        header: 'mb-6',
        body: 'flex-1 flex flex-col',
        footer: 'flex justify-end items-center pt-6 mt-auto border-t border-brand-grey-light',
      },
    },
    stepper: {
      slots: {
        wrapper: 'hidden',
        title: 'hidden',
        description: 'hidden',
        content: 'hidden',
        trigger: '!bg-transparent !border-none !ring-0 !shadow-none !outline-none text-transparent',
        indicator: 'm-auto w-3 h-3 flex-none rotate-45 rounded-none !bg-brand-grey-light group-data-[state=completed]:!bg-brand-orange group-data-[state=active]:!bg-brand-orange transition-colors duration-300',
        separator: '!bg-brand-grey-light group-data-[state=completed]:!bg-brand-orange transition-colors duration-300'
      }
    },
    pageCTA: {
      slots: {
        root: 'rounded-none bg-brand-white border-none py-0 lg:py-4 px-6 lg:px-8 shadow-[0.5rem_0.5rem_0_0_var(--color-brand-mustard),1rem_1rem_0_0_var(--color-brand-green)] ring-0',
        container: 'gap-8 lg:gap-12 !p-6 m-0 max-w-none lg:items-stretch h-full',
        wrapper: 'p-0 flex flex-col justify-center h-full',
        title: 'font-serif text-2xl lg:text-4xl font-bold text-brand-black mb-4',
        description: 'text-brand-grey-dark text-base'
      },
      variants: {
        variant: {
          outline: {
            root: 'rounded-none bg-brand-white border-none shadow-[0.5rem_0.5rem_0_0_var(--color-brand-mustard),1rem_1rem_0_0_var(--color-brand-green)] ring-0',
          },
          completed: {
            root: 'rounded-none bg-brand-brown border-none shadow-none ring-0 text-brand-white',
            title: 'text-brand-white',
            description: 'text-brand-white',
            icon: 'text-brand-white',
            footer: 'flex justify-between items-center w-full pt-6 mt-4 ',
          }
        }
      }
    },

  }
})
    
  
